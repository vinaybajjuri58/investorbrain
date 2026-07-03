import { NextRequest } from "next/server";
import { rememberText } from "@/lib/cognee";
import { ingestUrl, buildCogneeDocument, SourceDocument } from "@/lib/ingest";

export const runtime = "nodejs";

interface SourceBody {
  url?: string;
  text?: string;
  title?: string;
  creator?: string;
  kind?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
}

export async function POST(request: NextRequest) {
  let body: SourceBody;
  try {
    body = (await request.json()) as SourceBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, text, title, creator, kind } = body;

  let doc: SourceDocument;

  if (url) {
    // Ingest from URL
    try {
      doc = await ingestUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Distinguish "no transcript" from network errors
      if (msg.toLowerCase().includes("transcript")) {
        return Response.json({ error: msg }, { status: 422 });
      }
      if (
        msg.toLowerCase().includes("could not reach") ||
        msg.toLowerCase().includes("returned 4") ||
        msg.toLowerCase().includes("returned 5")
      ) {
        return Response.json({ error: msg }, { status: 502 });
      }
      return Response.json({ error: msg }, { status: 500 });
    }
  } else if (text) {
    // Raw note / personal text
    const now = new Date().toISOString();
    doc = {
      text: text.trim(),
      title: title?.trim() || "My Note",
      creator: creator?.trim() || "Me",
      url: `note://${now}`,
      sourceType: "note",
      ingestedAt: now,
    };
  } else {
    return Response.json(
      { error: "Provide either 'url' or 'text' in the request body" },
      { status: 400 }
    );
  }

  if (!doc.text) {
    return Response.json(
      { error: "Extracted document is empty — nothing to ingest" },
      { status: 422 }
    );
  }

  const content = buildCogneeDocument(doc);
  const filename = `${slugify(doc.title)}.txt`;

  try {
    await rememberText(content, filename, "investing", ["investing"]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Cognee ingestion failed: ${msg}` }, { status: 502 });
  }

  // Suppress unused-variable lint for kind (it's a valid future field)
  void kind;

  return Response.json({
    ok: true,
    title: doc.title,
    creator: doc.creator,
    sourceType: doc.sourceType,
  });
}
