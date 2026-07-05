import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { recall, SearchType, RecallResult } from "@/lib/cognee";

export const runtime = "nodejs";

/**
 * Grounds GRAPH_COMPLETION answers in the retrieved graph context.
 * Without this, Cognee's LLM answers questions about forgotten/absent topics
 * from its own general knowledge, which reads as "old data surviving a forget".
 * Wording is load-bearing — tested against present, category, and absent-topic
 * questions; see git history before rephrasing.
 */
const GROUNDED_PROMPT = `You answer questions using ONLY a personal knowledge-graph context provided along with the question. The context is a list of graph nodes (names plus optional text) and relationships between them. Node names alone are meaningful facts — e.g. a Thesis node named "Profit Growth in Food Delivery Segment" connected to "Zomato" is a real stored insight, even with empty content.

The graph contains typed nodes such as Creator (content creators/analysts the user follows), Source (videos, articles, notes), Company, Thesis, Catalyst, and SectorTheme. Questions like "my creators", "my sources", or "my view" refer to these node categories — treat them as present whenever nodes of that kind appear in the context.

Rules:
1. Identify the main entities or graph categories the question asks about.
2. If they appear anywhere in the context (node names, relationships, or text), you MUST attempt an answer: synthesize what the nodes, their names, and their connections imply. If coverage is partial, give the partial answer and briefly note what is missing. Never refuse when the subjects are present.
3. Only if the question's subjects appear NOWHERE in the context, reply exactly: "I don't have information about this in your knowledge graph. Try adding a source about it first." Never answer from your own general knowledge.`;

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
      systemPrompt: GROUNDED_PROMPT,
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
