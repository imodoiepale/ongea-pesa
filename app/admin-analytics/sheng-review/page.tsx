import Layout from "@/components/kokonutui/layout"
import { ShengReviewQueue } from "@/components/training/sheng-review-queue"

// Admin-shell view of the review queue. The /admin-analytics layout already
// enforces isAdminEmail; invited non-admin reviewers use /review instead, which
// gates on sheng_reviewers. Both render the same component and hit the same
// reviewer-gated API.
export default function AdminShengReviewPage() {
  return (
    <Layout>
      <ShengReviewQueue />
    </Layout>
  )
}
