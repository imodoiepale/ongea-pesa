import OngeaPesaApp from "@/components/ongea-pesa/app"
import { ProtectedRoute } from "@/components/protected-route"

export default function VoicePage() {
  return <ProtectedRoute><OngeaPesaApp initialScreen="voice" /></ProtectedRoute>
}
