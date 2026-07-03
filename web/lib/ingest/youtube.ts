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

export async function ingestYoutube(url: string): Promise<YoutubeDocument> {
  // Fetch transcript segments
  let segments: { text: string }[];
  try {
    segments = await YoutubeTranscript.fetchTranscript(url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Transcript unavailable for this video: ${msg}`);
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
