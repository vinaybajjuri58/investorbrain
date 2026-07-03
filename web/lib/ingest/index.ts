import { ingestYoutube } from "./youtube";
import { ingestArticle } from "./article";

export type SourceType = "youtube" | "article" | "note";

export interface SourceDocument {
  text: string;
  title: string;
  creator: string;
  url: string;
  sourceType: SourceType;
  ingestedAt: string;
}

export function detectSourceType(url: string): "youtube" | "article" {
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    if (h.includes("youtube.com") || h.includes("youtu.be")) {
      return "youtube";
    }
  } catch {
    // fall through to article
  }
  return "article";
}

export async function ingestUrl(url: string): Promise<SourceDocument> {
  const sourceType = detectSourceType(url);
  const ingestedAt = new Date().toISOString();

  if (sourceType === "youtube") {
    const doc = await ingestYoutube(url);
    return { ...doc, sourceType, ingestedAt };
  } else {
    const doc = await ingestArticle(url);
    return { ...doc, sourceType, ingestedAt };
  }
}

/**
 * Prepend a structured metadata header to the document text so that
 * Cognee's entity extraction can create Source and Creator nodes.
 */
export function buildCogneeDocument(doc: SourceDocument): string {
  return [
    `Source Title: ${doc.title}`,
    `Creator: ${doc.creator}`,
    `Source URL: ${doc.url}`,
    `Source Type: ${doc.sourceType}`,
    `Consumed At: ${doc.ingestedAt}`,
    "",
    doc.text,
  ].join("\n");
}
