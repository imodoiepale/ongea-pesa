import OngeaPesaApp from "@/components/ongea-pesa/app";
import { ProtectedRoute } from "@/components/protected-route";

export default function Home() {
  return (
    <ProtectedRoute>
      <OngeaPesaApp />
    </ProtectedRoute>
  );
}
