import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { forget } from "@/lib/cognee";

export const runtime = "nodejs";

interface ForgetBody {
  dataId?: string;
  all?: boolean;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ForgetBody;
  try {
    body = (await request.json()) as ForgetBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { dataId, all } = body;

  if (!dataId && !all) {
    return Response.json(
      { error: "Provide 'dataId' to forget a specific item, or 'all: true' to clear the dataset" },
      { status: 400 }
    );
  }

  const dataset = datasetForUser(email);

  try {
    if (dataId) {
      await forget({ dataId, dataset });
    } else {
      await forget({ dataset, memoryOnly: true });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Forget failed: ${msg}` }, { status: 502 });
  }

  return Response.json({ ok: true });
}
