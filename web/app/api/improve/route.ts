import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { improve } from "@/lib/cognee";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
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

  return Response.json({ ok: true, status: result });
}
