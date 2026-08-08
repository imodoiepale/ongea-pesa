import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { isShengReviewer } from "@/lib/sheng-reviewers"
import { FluidNav, ScreenShell, mobileNavItems } from "@/components/foundation"
import { ShengReviewQueue } from "@/components/training/sheng-review-queue"

/**
 * Standalone review route for invited Sheng reviewers.
 *
 * Deliberately NOT under /admin-analytics: that subtree requires isAdminEmail,
 * which would lock out exactly the people this queue is meant for. Access here
 * is gated on sheng_reviewers, so review can be handed to many contributors
 * without granting any access to revenue or user data.
 */
export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect("/login")

  const admin = createServiceClient()
  if (!(await isShengReviewer(admin, user.email))) redirect("/dashboard")

  return (
    <main className="orbital-page min-h-[100dvh] pb-nav">
      <ScreenShell className="pt-safe">
        <ShengReviewQueue />
      </ScreenShell>
      <FluidNav items={mobileNavItems} />
    </main>
  )
}
