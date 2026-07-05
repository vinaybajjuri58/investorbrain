import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { getStatus } from "@/lib/cognee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let status: Awaited<ReturnType<typeof getStatus>>;
  try {
    status = await getStatus(email);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not fetch status: ${msg}` }, { status: 502 });
  }

  // Filter the global status response to only include the user's dataset.
  // getStatus() returns statuses for all datasets; we never expose another
  // user's dataset name or processing state.
  const userDataset = datasetForUser(email);
  const userStatus: Record<string, unknown> = {};
  if (userDataset in status) {
    userStatus[userDataset] = status[userDataset];
  }

  return Response.json(userStatus);
}
