import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { rememberText, listDatasets, listData, getRawData } from "@/lib/cognee";
import { ingestUrl, buildCogneeDocument, SourceDocument } from "@/lib/ingest";
import { INVESTING_GRAPH_MODEL, EXTRACTION_PROMPT } from "@/lib/extraction";

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

/**
 * Parse the metadata header that buildCogneeDocument() prepends to every
 * ingested file ("Source Title: …", "Source URL: …", "Source Type: …").
 */
function parseDocHeader(raw: string): {
  title?: string;
  url?: string;
  sourceType?: string;
} {
  const head = raw.slice(0, 600);
  const get = (label: string) => {
    const m = new RegExp(`^${label}: (.+)$`, "m").exec(head);
    return m ? m[1].trim() : undefined;
  };
  return {
    title: get("Source Title"),
    url: get("Source URL"),
    sourceType: get("Source Type"),
  };
}

/** List the user's already-ingested sources (newest first). */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const datasetName = datasetForUser(email);
  try {
    const datasets = await listDatasets(email);
    const dataset = datasets.find((d) => d.name === datasetName);
    if (!dataset) {
      // New user with no dataset yet
      return Response.json({ ok: true, items: [] });
    }
    const data = await listData(email, dataset.id);

    // Original title/URL/type live in the document header, not the DataDTO —
    // fetch each item's raw text (small files, internal network) in parallel.
    const items = await Promise.all(
      data.slice(0, 100).map(async (d) => {
        let meta: ReturnType<typeof parseDocHeader> = {};
        try {
          meta = parseDocHeader(await getRawData(email, dataset.id, d.id));
        } catch {
          // Header is best-effort; fall back to the stored filename
        }
        return {
          id: d.id,
          name: d.name,
          createdAt: d.createdAt,
          title: meta.title,
          // note:// pseudo-URLs are internal — never expose them as links
          url: meta.url?.startsWith("http") ? meta.url : undefined,
          sourceType: meta.sourceType,
        };
      })
    );
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return Response.json({ ok: true, items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not list sources: ${msg}` }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const dataset = datasetForUser(email);

  try {
    // Pass the domain-typed graph model and extraction prompt.
    // No ontology_key — the custom graph_model + prompt fully control extraction.
    await rememberText(
      email,
      content,
      filename,
      dataset,
      undefined,
      INVESTING_GRAPH_MODEL || undefined,
      EXTRACTION_PROMPT,
    );
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
