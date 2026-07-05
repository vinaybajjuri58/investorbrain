import { YoutubeTranscript } from "youtube-transcript";

export interface YoutubeDocument {
  text: string;
  title: string;
  creator: string;
  url: string;
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  [key: string]: unknown;
}

interface SupadataResponse {
  content?: { text: string }[];
  [key: string]: unknown;
}

// YouTube withholds caption tracks from datacenter IPs (e.g. the production
// VPS), so the direct fetch that works in local dev fails there. Supadata
// proxies the same lookup through IPs YouTube trusts.
async function fetchViaSupadata(url: string): Promise<{ text: string }[]> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new Error("SUPADATA_API_KEY not set");
  }

  const res = await fetch(
    `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url)}`,
    { headers: { "x-api-key": apiKey } },
  );
  if (!res.ok) {
    throw new Error(`Supadata responded with ${res.status}`);
  }

  const data = (await res.json()) as SupadataResponse;
  if (!Array.isArray(data.content)) {
    throw new Error("Supadata returned no transcript content");
  }
  return data.content;
}

export async function ingestYoutube(url: string): Promise<YoutubeDocument> {
  // Fetch transcript segments: direct first (free), Supadata as fallback
  let segments: { text: string }[];
  try {
    segments = await YoutubeTranscript.fetchTranscript(url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      segments = await fetchViaSupadata(url);
    } catch (fallbackErr: unknown) {
      const fallbackMsg =
        fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `Transcript unavailable for this video: ${msg} (fallback: ${fallbackMsg})`,
      );
    }
  }

  if (!segments || segments.length === 0) {
    throw new Error("No transcript available for this video");
  }

  const text = segments.map((s) => s.text).join(" ");

  // Fetch title + channel via oEmbed (no API key needed)
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  let title = "Unknown Video";
  let creator = "Unknown Creator";

  try {
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "InvestorBrain/1.0" },
    });
    if (res.ok) {
      const meta = (await res.json()) as OEmbedResponse;
      if (meta.title) title = meta.title;
      if (meta.author_name) creator = meta.author_name;
    }
  } catch {
    // oEmbed is best-effort; proceed with defaults
  }

  return { text, title, creator, url };
}
