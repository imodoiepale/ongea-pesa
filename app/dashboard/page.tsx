import OngeaPesaApp from "@/components/ongea-pesa/app"
import { ProtectedRoute } from "@/components/protected-route"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <OngeaPesaApp />
    </ProtectedRoute>
  )
}
