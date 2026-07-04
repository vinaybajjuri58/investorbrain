import { auth } from "@/auth";
import Dashboard from "./components/Dashboard";

export default async function Home() {
  // auth() reads the session from the JWT cookie server-side.
  // The proxy (proxy.ts) guarantees this page is only reached by authenticated
  // users, so session will always be present here. We pass it as props to
  // avoid needing SessionProvider/useSession in the client component.
  const session = await auth();
  return <Dashboard user={session?.user ?? null} />;
}
