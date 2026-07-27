import OngeaPesaApp from "@/components/ongea-pesa/app"
import { ProtectedRoute } from "@/components/protected-route"

export default function ScannerPage() {
  return <ProtectedRoute><OngeaPesaApp initialScreen="scanner" /></ProtectedRoute>
}
