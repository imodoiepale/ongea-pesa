import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/admin'

/**
 * Admin gate for every /admin-analytics/* route.
 *
 * Previously only the index page (app/admin-analytics/page.tsx) checked
 * isAdminEmail. All 11 sub-pages are "use client" with no server gate and
 * middleware.ts has no admin matcher, so a signed-in non-admin could open
 * /admin-analytics/users directly and see whatever RLS happened to allow.
 *
 * A layout runs on the server for every nested route, so this one check
 * covers all of them. Keep it here rather than duplicating in each page.
 */
export default async function AdminAnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  if (!isAdminEmail(user.email)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
