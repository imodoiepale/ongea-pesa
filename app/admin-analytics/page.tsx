import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Layout from '@/components/kokonutui/layout'
import Content from '@/components/kokonutui/content'

export const metadata: Metadata = {
  title: 'Admin Analytics - Ongea Pesa',
  description: 'Analytics dashboard with sidebar navigation',
}

// List of admin emails
const ADMIN_EMAILS = [
  'ijepale@gmail.com',
  'admin@ongeapesa.com',
  'ongeapesa.kenya@gmail.com',
]

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Check if user is authenticated
  if (error || !user) {
    redirect('/login')
  }

  // Check if user is an admin
  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email)
  
  if (!isAdmin) {
    redirect('/') // Redirect non-admins to home
  }

  return (
    <Layout>
      <Content />
    </Layout>
  )
}
