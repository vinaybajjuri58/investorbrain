import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface ArticleDocument {
  text: string;
  title: string;
  creator: string;
  url: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function ingestArticle(url: string): Promise<ArticleDocument> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not reach URL: ${msg}`);
  }

  if (!res.ok) {
    throw new Error(`URL returned ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Could not extract readable content from this URL");
  }

  const siteName = new URL(url).hostname.replace(/^www\./, "");
  const creator = article.byline?.trim() || siteName;

  return {
    text: (article.textContent ?? "").trim(),
    title: article.title?.trim() || "Unknown Article",
    creator,
    url,
  };
}
