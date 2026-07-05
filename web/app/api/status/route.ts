import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { getStatus, listDatasets } from "@/lib/cognee";

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
  //
  // Cognee keys this map by dataset UUID (str(dataset.id)), NOT by name —
  // resolve the user's dataset id first (same pattern as the graph route).
  const userDataset = datasetForUser(email);
  const userStatus: Record<string, unknown> = {};
  try {
    const datasets = await listDatasets(email);
    const dataset = datasets.find((d) => d.name === userDataset);
    if (dataset && dataset.id in status) {
      userStatus[userDataset] = status[dataset.id];
    } else if (userDataset in status) {
      // Fallback for Cognee versions that key by dataset name
      userStatus[userDataset] = status[userDataset];
    }
  } catch {
    // New user with no datasets yet — report no status rather than an error
  }

  return Response.json(userStatus);
}
