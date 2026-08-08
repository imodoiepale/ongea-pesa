import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Active recording prompts. Reference data, readable by any signed-in user
// (sheng_prompts_read_all), so the RLS-bound client is correct here.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const variety = new URL(request.url).searchParams.get('variety')

  let query = supabase
    .from('sheng_prompts')
    .select('id,text,variety,category')
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (variety) query = query.eq('variety', variety)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prompts: data ?? [] })
}
