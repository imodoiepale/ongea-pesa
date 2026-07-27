import OngeaPesaApp from "@/components/ongea-pesa/app"
import { ProtectedRoute } from "@/components/protected-route"

export default function BatchPage() {
  return <ProtectedRoute><OngeaPesaApp initialScreen="batch" /></ProtectedRoute>
}
