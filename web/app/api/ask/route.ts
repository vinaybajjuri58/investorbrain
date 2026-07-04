import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { recall, SearchType, RecallResult } from "@/lib/cognee";

export const runtime = "nodejs";

interface AskBody {
  question: string;
  searchType?: SearchType;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, searchType } = body;

  if (!question || typeof question !== "string" || !question.trim()) {
    return Response.json({ error: "'question' is required" }, { status: 400 });
  }

  const dataset = datasetForUser(email);

  let results: RecallResult[];
  try {
    results = await recall(question.trim(), {
      datasets: [dataset],
      searchType: searchType ?? "GRAPH_COMPLETION",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Recall failed: ${msg}` }, { status: 502 });
  }

  // Extract the first completion text from results
  const first = results[0];
  const answer =
    (first?.answer ?? first?.text ?? first?.raw?.answer ?? null) as
      | string
      | null;

  return Response.json({ answer, results });
}
