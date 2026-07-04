import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { improve } from "@/lib/cognee";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  void _request;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataset = datasetForUser(email);

  let result: Record<string, unknown>;
  try {
    result = await improve(dataset);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Improve failed: ${msg}` }, { status: 502 });
  }

  // Cognee returns { "<dataset-uuid>": { status, ... } } for background runs,
  // but may also return a flat { status: "..." } object.
  // The client renders `status` as text, so reduce it to a string.
  let status: string;
  if (typeof result.status === "string") {
    // Flat top-level status field.
    status = result.status;
  } else {
    const run = Object.values(result)[0];
    if (run && typeof run === "object" && "status" in run && typeof (run as { status: unknown }).status === "string") {
      status = (run as { status: string }).status;
    } else {
      status = "Memory improvement queued.";
    }
  }

  return Response.json({ ok: true, status });
}
