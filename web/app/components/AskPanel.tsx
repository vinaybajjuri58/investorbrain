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
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1.5 text-[#c4d3e8]">
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
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1.5 text-[#c4d3e8]">
          {items}
        </ol>
      );
      continue;
    }

    if (/^###\s/.test(line)) {
      nodes.push(
        <p key={`h3-${i}`} className="font-semibold text-[#e4edf8] mt-2.5 mb-0.5 text-[12.5px]">
          {renderInline(line.replace(/^###\s/, ""))}
        </p>
      );
      i++;
      continue;
    }
    if (/^##\s/.test(line)) {
      nodes.push(
        <p key={`h2-${i}`} className="font-bold text-[#e4edf8] mt-2.5 mb-0.5 text-[13px]">
          {renderInline(line.replace(/^##\s/, ""))}
        </p>
      );
      i++;
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="text-[#c4d3e8] leading-relaxed">
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
        <strong key={idx} className="text-[#e4edf8] font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={idx}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={idx}
          className="bg-[#162035] text-[#fbbf24] px-1.5 py-0.5 rounded text-[0.82em] font-mono"
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
    <div className="flex flex-col h-full bg-[#0d1320]">

      {/* ── Preset chips ── */}
      <div className="flex-none px-3 pt-3 pb-2.5 flex flex-wrap gap-1.5 border-b border-[#1c2a3f]">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => ask(p)}
            title={p}
            className="text-[10.5px] text-[#7b97b5] border border-[#253548] bg-[#111928] hover:bg-[#162035] hover:text-[#e4edf8] hover:border-[#f59e0b44] active:scale-95 rounded-full px-2.5 py-1 leading-tight transition-all duration-150 text-left cursor-pointer"
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
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4 py-8">
            {/* Decorative icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden className="opacity-30">
              <circle cx="16" cy="16" r="14" stroke="#f59e0b" strokeWidth="1.2"/>
              <path d="M10 16h12M16 10v12" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div className="space-y-1">
              <p className="text-[#7b97b5] text-[12.5px] font-medium">
                Ask anything about your investment knowledge
              </p>
              <p className="text-[#4a5c6e] text-[11px]">
                Use a preset above or type a question below.
              </p>
            </div>
          </div>
        )}

        {/* Q&A history */}
        {history.map((item) => (
          <div key={item.id} className="space-y-2">
            {/* Question — right-aligned */}
            <div className="flex justify-end">
              <div
                className="max-w-[85%] rounded-xl rounded-tr-[4px] px-3 py-2 text-[12.5px] text-[#e4edf8] leading-relaxed"
                style={{
                  background: "#162035",
                  border: "1px solid #253548",
                }}
              >
                {item.question}
              </div>
            </div>

            {/* Answer — left-aligned */}
            <div className="flex justify-start">
              <div
                className="max-w-[90%] rounded-xl rounded-tl-[4px] px-3 py-2.5 text-[12.5px]"
                style={{
                  background: "#111928",
                  border: "1px solid #1c2a3f",
                }}
              >
                {item.loading ? (
                  /* Thinking dots */
                  <div className="flex items-center gap-1.5 py-1.5">
                    {[0, 1, 2].map((n) => (
                      <span
                        key={n}
                        className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#f59e0b] inline-block"
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
        className="flex-none p-3 border-t border-[#1c2a3f]"
        style={{ background: "#0d1320" }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your knowledge graph…"
            rows={2}
            aria-label="Question input"
            className="flex-1 rounded-lg px-3 py-2 text-[12.5px] text-[#e4edf8] placeholder-[#4a5c6e] resize-none focus:outline-none transition-colors duration-150"
            style={{
              background:  "#111928",
              border:      "1px solid #253548",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b66")}
            onBlur={(e)  => (e.currentTarget.style.borderColor = "#253548")}
          />

          {/* Send button */}
          <button
            onClick={() => ask(question)}
            disabled={!question.trim()}
            aria-label="Submit question"
            className="flex-none flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-semibold transition-all duration-150 h-[58px] cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              background: question.trim() ? "#f59e0b" : "#162035",
              color:      question.trim() ? "#080c14" : "#4a5c6e",
              border:     "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (question.trim())
                e.currentTarget.style.background = "#fbbf24";
            }}
            onMouseLeave={(e) => {
              if (question.trim())
                e.currentTarget.style.background = "#f59e0b";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
              <path d="M1 6.5h11M7.5 2L12 6.5 7.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ask
          </button>
        </div>

        <p className="text-[10px] text-[#4a5c6e] mt-1.5 pl-0.5">
          Cmd/Ctrl + Enter to submit
        </p>
      </div>
    </div>
  );
}
