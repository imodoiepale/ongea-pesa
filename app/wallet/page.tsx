import TransactionHistory from "@/components/ongea-pesa/transaction-history"
import { ProtectedRoute } from "@/components/protected-route"

export default function WalletPage() {
  return <ProtectedRoute><TransactionHistory /></ProtectedRoute>
}
