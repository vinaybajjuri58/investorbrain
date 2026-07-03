"use client";

import { useState, useCallback, useRef } from "react";
import { fetchJson } from "@/app/hooks/useApi";

// ---- helpers ----
function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

interface SourceResponse {
  ok: boolean;
  title?: string;
  creator?: string;
  sourceType?: string;
  error?: string;
}

interface SetupResponse {
  ok: boolean;
}

interface Props {
  onSourceAdded: () => void;
}

// ---- inline SVG icons ----
function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3.5" width="14" height="9" rx="2.5" fill="#FF0000" />
      <polygon points="6.5,5.5 11,8 6.5,10.5" fill="white" />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="#8b949e" strokeWidth="1.2" />
      <line x1="4.5" y1="5.5" x2="11.5" y2="5.5" stroke="#8b949e" strokeWidth="1" strokeLinecap="round" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="#8b949e" strokeWidth="1" strokeLinecap="round" />
      <line x1="4.5" y1="10.5" x2="8.5" y2="10.5" stroke="#8b949e" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 6.5l3.5 3.5 5.5-6" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- component ----
export default function SourcePanel({ onSourceAdded }: Props) {
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteResult, setNoteResult] = useState<{ ok: boolean; message: string } | null>(null);

  const setupCalledRef = useRef(false);

  const callSetup = useCallback(async () => {
    if (setupCalledRef.current) return;
    setupCalledRef.current = true;
    try {
      await fetchJson<SetupResponse>("/api/setup", { method: "POST", body: "{}" });
    } catch {
      // setup is idempotent; ignore errors
    }
  }, []);

  const handleAddUrl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setUrlLoading(true);
    setUrlResult(null);
    try {
      await callSetup();
      const data = await fetchJson<SourceResponse>("/api/sources", {
        method: "POST",
        body: JSON.stringify({ url: trimmed }),
      });
      if (data.ok) {
        const who = data.creator ? ` by ${data.creator}` : "";
        const what = data.title ?? trimmed;
        setUrlResult({ ok: true, message: `Remembered: "${what}"${who}` });
        setUrl("");
        onSourceAdded();
      } else {
        setUrlResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch (err) {
      setUrlResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setUrlLoading(false);
    }
  }, [url, callSetup, onSourceAdded]);

  const handleAddNote = useCallback(async () => {
    const content = noteContent.trim();
    if (!content) return;

    setNoteLoading(true);
    setNoteResult(null);
    try {
      await callSetup();
      const body: Record<string, string> = { text: content, kind: "note" };
      if (noteTitle.trim()) body.title = noteTitle.trim();
      const data = await fetchJson<SourceResponse>("/api/sources", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (data.ok) {
        const what = data.title ?? noteTitle.trim() ?? "Note";
        setNoteResult({ ok: true, message: `Remembered: "${what}"` });
        setNoteContent("");
        setNoteTitle("");
        onSourceAdded();
      } else {
        setNoteResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch (err) {
      setNoteResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setNoteLoading(false);
    }
  }, [noteTitle, noteContent, callSetup, onSourceAdded]);

  const yt = url.trim() ? isYouTube(url.trim()) : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5">
      {/* URL section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Add URL
        </div>

        <div className="relative">
          {/* Icon overlay */}
          {yt !== null && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {yt ? <YouTubeIcon /> : <ArticleIcon />}
            </span>
          )}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            placeholder="https://youtube.com/… or https://blog.example.com/…"
            className={`w-full bg-[#161b22] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff66] transition-colors py-2.5 pr-3 ${yt !== null ? "pl-9" : "pl-3"}`}
          />
        </div>

        <button
          onClick={handleAddUrl}
          disabled={!url.trim() || urlLoading}
          className="w-full bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-35 disabled:cursor-not-allowed text-white rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
        >
          {urlLoading ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" />
              </svg>
              Adding…
            </>
          ) : (
            "Add"
          )}
        </button>

        {urlResult && (
          <div
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
              urlResult.ok
                ? "bg-[#0d2218] border border-[#1a4731] text-[#3fb950]"
                : "bg-[#2d1519] border border-[#6e1a1a] text-red-400"
            }`}
          >
            {urlResult.ok && <CheckIcon />}
            <span className="leading-relaxed">{urlResult.message}</span>
          </div>
        )}
      </div>

      <div className="border-t border-[#21262d]" />

      {/* Note section */}
      <div className="space-y-2">
        <button
          onClick={() => setNoteOpen((o) => !o)}
          className="flex items-center gap-2 w-full text-xs font-semibold text-[#8b949e] uppercase tracking-wider hover:text-[#e6edf3] transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform ${noteOpen ? "rotate-90" : ""}`}
          >
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Paste a note
        </button>

        {noteOpen && (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff66] transition-colors"
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Paste your note, thesis, or research here…"
              rows={5}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff66] transition-colors resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || noteLoading}
              className="w-full bg-[#1a3a1a] hover:bg-[#1f4f1f] border border-[#2d6a2d] disabled:opacity-35 disabled:cursor-not-allowed text-[#3fb950] rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              {noteLoading ? (
                <>
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" />
                  </svg>
                  Saving…
                </>
              ) : (
                "Save Note"
              )}
            </button>
            {noteResult && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  noteResult.ok
                    ? "bg-[#0d2218] border border-[#1a4731] text-[#3fb950]"
                    : "bg-[#2d1519] border border-[#6e1a1a] text-red-400"
                }`}
              >
                {noteResult.ok && <CheckIcon />}
                <span className="leading-relaxed">{noteResult.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="text-[11px] text-[#484f58] leading-relaxed">
        YouTube videos and blog articles are auto-detected and transcribed.
        Notes are ingested as raw text.
        Cognee processes them into the knowledge graph in the background.
      </div>
    </div>
  );
}
