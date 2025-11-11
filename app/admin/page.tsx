import { Metadata } from 'next'
import RevenueDashboard from '@/components/admin/revenue-dashboard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  // TODO: Add admin role check here
  // For now, any authenticated user can access
  // In production, check if user has 'admin' or 'creator' role
  // Example:
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('role')
  //   .eq('id', user.id)
  //   .single()
  // 
  // if (profile?.role !== 'admin') {
  //   redirect('/dashboard')
  // }

  return (
    <div className="min-h-screen">
      <RevenueDashboard />
    </div>
  )
}
