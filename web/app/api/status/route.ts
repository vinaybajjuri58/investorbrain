import { getStatus } from "@/lib/cognee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let status: Awaited<ReturnType<typeof getStatus>>;
  try {
    status = await getStatus();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not fetch status: ${msg}` }, { status: 502 });
  }

  return Response.json(status);
}
