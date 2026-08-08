import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'

/**
 * Review access for the Sheng training queue.
 *
 * Deliberately separate from lib/admin.ts: review is a high-volume, low-trust
 * task you want to hand to many people, and granting it should never imply
 * access to the money dashboards. Admins are reviewers implicitly so the queue
 * is never locked out, but reviewers are not admins.
 *
 * Requires a service-role client — sheng_reviewers is service-role-only except
 * for a row's own user.
 */
export async function isShengReviewer(
  admin: SupabaseClient,
  email: string | null | undefined,
): Promise<boolean> {
  if (!email) return false
  if (isAdminEmail(email)) return true

  const { data, error } = await admin
    .from('sheng_reviewers')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('active', true)
    .maybeSingle()

  if (error) {
    console.error('❌ sheng_reviewers lookup failed:', error)
    return false
  }
  return Boolean(data)
}
