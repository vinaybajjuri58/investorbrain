"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { fetchJson } from "@/app/hooks/useApi";

// -------- types --------
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

// -------- preset chips --------
const PRESETS = [
  "Bull case vs bear case — and who argues each side?",
  "Where do my creators contradict each other?",
  "Which theses hinge on a catalyst due this quarter?",
  "Which bullish theses come only from permabull creators?",
  "How did my view evolve over time?",
];

// -------- simple markdown → JSX --------
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      nodes.push(<div key={`gap-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Bullet list block
    if (/^[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(
          <li key={i}>{renderInline(lines[i].replace(/^[-*]\s/, ""))}</li>
        );
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1.5 text-[#c9d1d9]">
          {items}
        </ul>
      );
      continue;
    }

    // Numbered list block
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(
          <li key={i}>{renderInline(lines[i].replace(/^\d+\.\s/, ""))}</li>
        );
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1.5 text-[#c9d1d9]">
          {items}
        </ol>
      );
      continue;
    }

    // Heading
    if (/^###\s/.test(line)) {
      nodes.push(
        <p key={`h3-${i}`} className="font-semibold text-[#e6edf3] mt-2 mb-0.5">
          {renderInline(line.replace(/^###\s/, ""))}
        </p>
      );
      i++;
      continue;
    }
    if (/^##\s/.test(line)) {
      nodes.push(
        <p key={`h2-${i}`} className="font-bold text-[#e6edf3] mt-2 mb-0.5">
          {renderInline(line.replace(/^##\s/, ""))}
        </p>
      );
      i++;
      continue;
    }

    // Normal paragraph
    nodes.push(
      <p key={`p-${i}`} className="text-[#c9d1d9] leading-relaxed">
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
      return <strong key={idx} className="text-[#e6edf3]">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={idx}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={idx} className="bg-[#21262d] text-[#79c0ff] px-1 rounded text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

// -------- component --------
export default function AskPanel() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAItem[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when history grows
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  const ask = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      const id = `qa-${Date.now()}`;
      const placeholder: QAItem = {
        id,
        question: trimmed,
        answer: "",
        loading: true,
      };
      setHistory((h) => [...h, placeholder]);
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
    },
    []
  );

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
    <div className="flex flex-col h-full">
      {/* Preset chips */}
      <div className="flex-none px-3 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-[#21262d]">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => ask(p)}
            className="text-[10px] text-[#58a6ff] border border-[#1f3352] bg-[#0d1f35] hover:bg-[#132240] hover:border-[#58a6ff55] rounded-full px-2.5 py-1 leading-tight transition-colors text-left"
            title={p}
          >
            {p.length > 40 ? p.slice(0, 38) + "…" : p}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0"
      >
        {history.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[#484f58] text-sm text-center leading-relaxed">
              Ask anything about your investing knowledge graph.
              <br />
              <span className="text-[11px]">Use a preset above or type below.</span>
            </p>
          </div>
        )}

        {history.map((item) => (
          <div key={item.id} className="space-y-2">
            {/* Question bubble */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-[#1f3352] border border-[#2d4a73] rounded-xl rounded-tr-sm px-3 py-2 text-sm text-[#cae3ff]">
                {item.question}
              </div>
            </div>

            {/* Answer bubble */}
            <div className="flex justify-start">
              <div className="max-w-[90%] bg-[#161b22] border border-[#30363d] rounded-xl rounded-tl-sm px-3 py-2.5 text-sm">
                {item.loading ? (
                  <div className="flex items-center gap-1.5 py-1">
                    {[0, 1, 2].map((n) => (
                      <span
                        key={n}
                        className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#58a6ff] inline-block"
                      />
                    ))}
                  </div>
                ) : item.error ? (
                  <p className="text-red-400 text-[12px]">{item.error}</p>
                ) : (
                  <div className="text-[13px] leading-relaxed">
                    {renderMarkdown(item.answer)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="flex-none p-3 border-t border-[#21262d] bg-[#0d1117]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your knowledge graph…"
            rows={2}
            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] resize-none focus:outline-none focus:border-[#58a6ff66] transition-colors"
          />
          <button
            onClick={() => ask(question)}
            disabled={!question.trim()}
            className="flex-none flex items-center gap-1.5 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-35 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-xs font-medium transition-colors h-[58px]"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M1 6.5h11M7.5 2L12 6.5 7.5 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ask
          </button>
        </div>
        <p className="text-[10px] text-[#484f58] mt-1.5 pl-0.5">
          Cmd/Ctrl + Enter to submit
        </p>
      </div>
    </div>
  );
}
