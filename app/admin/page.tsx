import { Metadata } from 'next'
import RevenueDashboard from '@/components/admin/revenue-dashboard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Ongea Pesa',
  description: 'Revenue analytics and platform statistics',
}

// List of admin emails (add your admin emails here)
const ADMIN_EMAILS = [
  'ijepale@gmail.com',
  'admin@ongeapesa.com',
];

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Check if user is authenticated
  if (error || !user) {
    redirect('/login')
  }

  // Check if user is an admin by email or role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = ADMIN_EMAILS.includes(user.email || '') || profile?.role === 'admin' || profile?.role === 'creator';

  if (!isAdmin) {
    console.log('Access denied for user:', user.email, 'role:', profile?.role);
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen">
      <RevenueDashboard />
    </div>
  )
}
