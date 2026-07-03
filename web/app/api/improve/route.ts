import { NextRequest } from "next/server";
import { improve } from "@/lib/cognee";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  let result: Record<string, unknown>;
  try {
    result = await improve("investing");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Improve failed: ${msg}` }, { status: 502 });
  }

  return Response.json({ ok: true, status: result });
}
