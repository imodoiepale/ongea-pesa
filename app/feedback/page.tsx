import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FluidNav, PageHeader, ScreenShell, mobileNavItems } from "@/components/foundation"
import { FeedbackForm } from "@/components/ongea-pesa/feedback-form"

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  return (
    <main id="main-content" className="orbital-page og-screen-in min-h-[100dvh] pb-nav">
      <ScreenShell className="pt-safe">
        <PageHeader title="Tell us" subtitle="Report a problem, or tell us how you use Ongea Pesa" />
        <div className="mt-4">
          <FeedbackForm />
        </div>
      </ScreenShell>
      <FluidNav items={mobileNavItems} />
    </main>
  )
}
