import { auth } from "@/auth";
import Dashboard from "../components/Dashboard";

// The proxy (proxy.ts) guarantees this page is only reached by authenticated
// users, so session will always be present. We pass it as props to avoid
// needing SessionProvider/useSession in the client component.
export default async function DashboardPage() {
  const session = await auth();
  return <Dashboard user={session?.user ?? null} />;
}
