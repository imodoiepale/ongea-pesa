import { ProtectedRoute } from "@/components/protected-route"
import { VoiceFundingScreen } from "@/components/ongea-pesa/voice-funding"

export default function VoiceFundingPage() {
  return (
    <ProtectedRoute>
      <VoiceFundingScreen />
    </ProtectedRoute>
  )
}
