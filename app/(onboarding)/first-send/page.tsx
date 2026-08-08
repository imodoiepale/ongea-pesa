import { ProtectedRoute } from "@/components/protected-route"
import { FirstSendScreen } from "@/components/ongea-pesa/first-send"

export default function FirstSendPage() {
  return (
    <ProtectedRoute>
      <FirstSendScreen />
    </ProtectedRoute>
  )
}
