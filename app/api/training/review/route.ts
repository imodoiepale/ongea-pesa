import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isShengReviewer } from '@/lib/sheng-reviewers'

// Reviewer-gated queue for Sheng training submissions.
//
// Gated by sheng_reviewers (lib/sheng-reviewers.ts), NOT isAdminEmail — review is
// meant to be handed to many people without granting money-dashboard access.
// Uses the service client because a reviewer must read other users' rows, which
// RLS correctly forbids for the browser client.

// Two independent verdicts before a contribution is settled. One reviewer's word
// is not evidence of transcript accuracy, and agreement is the only signal we
// have for reviewer quality.
const REQUIRED_REVIEWS = 2

const submitReview = z.object({
  contribution_id: z.string().uuid(),
  verdict: z.enum(['approve', 'correct', 'reject']),
  corrected_transcript: z.string().trim().max(2000).optional(),
  audio_quality: z.enum(['good', 'noisy', 'unusable']).optional(),
  notes: z.string().trim().max(1000).optional(),
})

async function reviewerContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, admin: null, allowed: false as const }
  const admin = createServiceClient()
  const allowed = await isShengReviewer(admin, user.email)
  return { user, admin, allowed }
}

/** GET — the pending queue, least-reviewed first, with playable signed URLs. */
export async function GET(request: NextRequest) {
  const { user, admin, allowed } = await reviewerContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? 25), 100)

  const { data: rows, error } = await admin
    .from('sheng_contributions')
    .select('id,user_id,prompt_id,audio_path,transcript,variety,duration_ms,review_count,created_at')
    .eq('status', 'pending')
    .order('review_count', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const contributions = rows ?? []

  // Skip anything this reviewer already judged — the UNIQUE constraint would
  // reject the second verdict anyway, so showing it just wastes their time.
  const { data: mine } = await admin
    .from('sheng_reviews')
    .select('contribution_id')
    .eq('reviewer_id', user.id)
    .in('contribution_id', contributions.map((c) => c.id))

  const alreadyReviewed = new Set((mine ?? []).map((r) => r.contribution_id))
  const queue = contributions.filter((c) => !alreadyReviewed.has(c.id))

  // Prompts, so the reviewer can see what was asked for.
  const promptIds = [...new Set(queue.map((c) => c.prompt_id).filter(Boolean))] as string[]
  const promptText = new Map<string, string>()
  if (promptIds.length) {
    const { data: prompts } = await admin
      .from('sheng_prompts')
      .select('id,text')
      .in('id', promptIds)
    for (const p of prompts ?? []) promptText.set(p.id, p.text)
  }

  const withAudio = await Promise.all(
    queue.map(async (c) => {
      const { data: signed } = await admin.storage
        .from('sheng-training-audio')
        .createSignedUrl(c.audio_path, 3600)
      return {
        id: c.id,
        transcript: c.transcript,
        variety: c.variety,
        duration_ms: c.duration_ms,
        review_count: c.review_count,
        created_at: c.created_at,
        prompt_text: c.prompt_id ? promptText.get(c.prompt_id) ?? null : null,
        audio_url: signed?.signedUrl ?? null,
      }
    }),
  )

  return NextResponse.json({ queue: withAudio, required_reviews: REQUIRED_REVIEWS })
}

/** POST — record one verdict, and settle the contribution once enough are in. */
export async function POST(request: NextRequest) {
  const { user, admin, allowed } = await reviewerContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed || !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = submitReview.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review', issues: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data

  if (body.verdict === 'correct' && !body.corrected_transcript) {
    return NextResponse.json(
      { error: 'corrected_transcript is required when the verdict is "correct"' },
      { status: 400 },
    )
  }

  const { error: insertError } = await admin.from('sheng_reviews').insert({
    contribution_id: body.contribution_id,
    reviewer_id: user.id,
    verdict: body.verdict,
    corrected_transcript: body.corrected_transcript ?? null,
    audio_quality: body.audio_quality ?? null,
    notes: body.notes ?? null,
  })

  if (insertError) {
    // 23505 = the UNIQUE(contribution_id, reviewer_id) guard.
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already reviewed this clip' }, { status: 409 })
    }
    console.error('❌ sheng_reviews insert failed:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Re-read all verdicts rather than trusting an incremented counter, so a
  // concurrent second reviewer cannot settle on a stale count.
  const { data: allReviews, error: readError } = await admin
    .from('sheng_reviews')
    .select('verdict,corrected_transcript')
    .eq('contribution_id', body.contribution_id)

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })

  const reviews = allReviews ?? []
  const approvals = reviews.filter((r) => r.verdict === 'approve' || r.verdict === 'correct').length
  const rejections = reviews.filter((r) => r.verdict === 'reject').length

  const update: Record<string, unknown> = { review_count: reviews.length }
  let settled: string | null = null

  if (rejections >= REQUIRED_REVIEWS) {
    update.status = 'rejected'
    settled = 'rejected'
  } else if (approvals >= REQUIRED_REVIEWS) {
    update.status = 'approved'
    settled = 'approved'
    // A correction is a better label than the contributor's own transcript, so
    // promote the first one onto the row that the export will read.
    const correction = reviews.find((r) => r.verdict === 'correct' && r.corrected_transcript)
    if (correction) update.transcript = correction.corrected_transcript
  }

  const { error: updateError } = await admin
    .from('sheng_contributions')
    .update(update)
    .eq('id', body.contribution_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    review_count: reviews.length,
    required_reviews: REQUIRED_REVIEWS,
    status: settled ?? 'pending',
  })
}
