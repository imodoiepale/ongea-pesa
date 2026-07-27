import { Metadata } from 'next'
import RevenueDashboard from '@/components/admin/revenue-dashboard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/admin'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Ongea Pesa',
  description: 'Revenue analytics and platform statistics',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Check if user is authenticated
  if (error || !user) {
    redirect('/login')
  }

  // Same allowlist the /api/admin/* routes enforce (lib/admin.ts)
  if (!isAdminEmail(user.email)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen">
      <RevenueDashboard />
    </div>
  )
}
