import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Layout from '@/components/kokonutui/layout'
import Content from '@/components/kokonutui/content'
import { isAdminEmail } from '@/lib/admin'

export const metadata: Metadata = {
  title: 'Admin Analytics - Ongea Pesa',
  description: 'Analytics dashboard with sidebar navigation',
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Check if user is authenticated
  if (error || !user) {
    redirect('/login')
  }

  // Same allowlist the /api/admin/* routes enforce (lib/admin.ts)
  if (!isAdminEmail(user.email)) {
    redirect('/dashboard') // Redirect non-admins to home
  }

  return (
    <Layout>
      <Content />
    </Layout>
  )
}
