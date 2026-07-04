"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { fetchJson } from "@/app/hooks/useApi";

// ── Types ──
interface QAItem {
  id: string;
  question: string;
  answer: string;
  loading: boolean;
  error?: string;
}

interface AskResponse {
  answer: string;
  results?: unknown;
}

// ── Preset chips ──
const PRESETS = [
  "Bull case vs bear case — and who argues each side?",
  "Where do my creators contradict each other?",
  "Which theses hinge on a catalyst due this quarter?",
  "Which bullish theses come only from permabull creators?",
  "How did my view evolve over time?",
];

// ── Minimal markdown → JSX ──
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      nodes.push(<div key={`gap-${i}`} className="h-2" />);
      i++;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(
          <li key={i}>{renderInline(lines[i].replace(/^[-*]\s/, ""))}</li>
        );
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1.5 text-[#8daac8]">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(
          <li key={i}>{renderInline(lines[i].replace(/^\d+\.\s/, ""))}</li>
        );
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1.5 text-[#8daac8]">
          {items}
        </ol>
      );
      continue;
    }

    if (/^###\s/.test(line)) {
      nodes.push(
        <p key={`h3-${i}`} className="font-semibold text-[#d8e3f2] mt-2.5 mb-0.5 text-[12.5px]">
          {renderInline(line.replace(/^###\s/, ""))}
        </p>
      );
      i++;
      continue;
    }
    if (/^##\s/.test(line)) {
      nodes.push(
        <p key={`h2-${i}`} className="font-bold text-[#d8e3f2] mt-2.5 mb-0.5 text-[13px]">
          {renderInline(line.replace(/^##\s/, ""))}
        </p>
      );
      i++;
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="text-[#8daac8] leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={idx} className="text-[#d8e3f2] font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={idx}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded text-[0.82em] font-mono"
          style={{ background: "#0f1c2e", color: "#3b82f6", border: "1px solid #1a3050" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

// ── Component ──
export default function AskPanel() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAItem[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when history grows
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    const id = `qa-${Date.now()}`;
    setHistory((h) => [
      ...h,
      { id, question: trimmed, answer: "", loading: true },
    ]);
    setQuestion("");

    try {
      const data = await fetchJson<AskResponse>("/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: trimmed }),
      });
      setHistory((h) =>
        h.map((item) =>
          item.id === id
            ? { ...item, answer: data.answer ?? "", loading: false }
            : item
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setHistory((h) =>
        h.map((item) =>
          item.id === id
            ? { ...item, answer: "", loading: false, error: msg }
            : item
        )
      );
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        ask(question);
      }
    },
    [ask, question]
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "#070c14" }}>

      {/* ── Preset chips ── */}
      <div
        className="flex-none px-3 pt-3 pb-2.5 flex flex-wrap gap-1.5"
        style={{ borderBottom: "1px solid #112238" }}
      >
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => ask(p)}
            title={p}
            className="text-[10.5px] rounded-full px-2.5 py-1 leading-tight text-left cursor-pointer active:scale-95"
            style={{
              color: "#56738e",
              background: "#0b1120",
              border: "1px solid #1a3050",
              transition: "all 200ms cubic-bezier(0.32,0.72,0,1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#d8e3f2";
              e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)";
              e.currentTarget.style.background = "#0f1c2e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#56738e";
              e.currentTarget.style.borderColor = "#1a3050";
              e.currentTarget.style.background = "#0b1120";
            }}
          >
            {p.length > 38 ? p.slice(0, 36) + "…" : p}
          </button>
        ))}
      </div>

      {/* ── Conversation history ── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0"
      >
        {/* Empty state */}
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-4 py-8">
            {/* Decorative graph icon with glow */}
            <div style={{ filter: "drop-shadow(0 0 12px rgba(37,99,235,0.35))" }}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
                <circle cx="22" cy="22" r="19" stroke="#112238" strokeWidth="1.5"/>
                <circle cx="22" cy="22" r="19" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="22" y1="22" x2="10" y2="10" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.5"/>
                <line x1="22" y1="22" x2="34" y2="10" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.5"/>
                <line x1="22" y1="22" x2="10" y2="34" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.5"/>
                <line x1="22" y1="22" x2="34" y2="34" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.5"/>
                <circle cx="10" cy="10" r="3" fill="#22c55e"/>
                <circle cx="34" cy="10" r="3" fill="#4f9cf9"/>
                <circle cx="10" cy="34" r="3" fill="#ef4444"/>
                <circle cx="34" cy="34" r="3" fill="#a78bfa"/>
                <circle cx="22" cy="22" r="5" fill="#2563eb"/>
                <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.3)"/>
              </svg>
            </div>
            <div className="space-y-1.5">
              <p
                className="text-[12.5px] font-semibold text-[#56738e]"
                style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
              >
                Ask your knowledge graph
              </p>
              <p className="text-[11px]" style={{ color: "#2d4460" }}>
                Use a preset above or type below.
              </p>
            </div>
          </div>
        )}

        {/* Q&A history */}
        {history.map((item) => (
          <div key={item.id} className="space-y-2">
            {/* Question — right-aligned, blue bubble */}
            <div className="flex justify-end">
              <div
                className="max-w-[85%] rounded-2xl rounded-tr-[6px] px-3.5 py-2 text-[12.5px] leading-relaxed font-medium"
                style={{
                  background: "linear-gradient(135deg, #1e40af, #2563eb)",
                  color: "#e8f0ff",
                  boxShadow: "0 2px 12px rgba(37,99,235,0.25)",
                }}
              >
                {item.question}
              </div>
            </div>

            {/* Answer — left-aligned */}
            <div className="flex justify-start">
              <div
                className="max-w-[90%] rounded-2xl rounded-tl-[6px] px-3.5 py-2.5 text-[12.5px]"
                style={{
                  background: "#0b1120",
                  border: "1px solid #112238",
                }}
              >
                {item.loading ? (
                  <div className="flex items-center gap-1.5 py-1">
                    {[0, 1, 2].map((n) => (
                      <span
                        key={n}
                        className="thinking-dot w-1.5 h-1.5 rounded-full inline-block"
                        style={{ background: "#2563eb" }}
                      />
                    ))}
                  </div>
                ) : item.error ? (
                  <p className="text-[#f87171] text-[11.5px] leading-relaxed">
                    {item.error}
                  </p>
                ) : (
                  <div className="leading-relaxed">
                    {renderMarkdown(item.answer)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Input area ── */}
      <div
        className="flex-none p-3"
        style={{ borderTop: "1px solid #112238", background: "#070c14" }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your knowledge graph…"
            rows={2}
            aria-label="Question input"
            className="flex-1 rounded-xl px-3.5 py-2.5 text-[12.5px] resize-none focus:outline-none"
            style={{
              background: "#0b1120",
              border: "1px solid #1a3050",
              color: "#d8e3f2",
              transition: "border-color 200ms ease, box-shadow 200ms ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(37,99,235,0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#1a3050";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          {/* Send button */}
          <button
            onClick={() => ask(question)}
            disabled={!question.trim()}
            aria-label="Submit question"
            className="flex-none flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11.5px] font-semibold h-[58px] cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: question.trim() ? "#2563eb" : "#0f1c2e",
              color:      question.trim() ? "#e8f0ff" : "#2d4460",
              border:     "1px solid transparent",
              transition: "all 200ms cubic-bezier(0.32,0.72,0,1)",
            }}
            onMouseEnter={(e) => {
              if (question.trim()) {
                e.currentTarget.style.background = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(37,99,235,0.45)";
              }
            }}
            onMouseLeave={(e) => {
              if (question.trim()) {
                e.currentTarget.style.background = "#2563eb";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
              <path d="M1 6.5h11M7.5 2L12 6.5 7.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ask
          </button>
        </div>

        <p className="text-[10px] mt-1.5 pl-0.5" style={{ color: "#2d4460" }}>
          ⌘ + Enter to submit
        </p>
      </div>
    </div>
  );
}
