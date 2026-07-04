import { TYPE_COLOURS, LEGEND_LABELS } from "@/app/components/graphTypes";

interface Props {
  usedTypes: string[];
  isProcessing: boolean;
  onRefresh: () => void;
}

export default function GraphOverlay({ usedTypes, isProcessing, onRefresh }: Props) {
  return (
    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
      {usedTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-w-[65%]">
          {usedTypes.map((k) => (
            <div
              key={k}
              className="flex items-center gap-1.5 rounded-md px-2 py-1"
              style={{
                background: "rgba(5,5,5,0.88)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background:  TYPE_COLOURS[k],
                  boxShadow:   `0 0 6px ${TYPE_COLOURS[k]}99`,
                }}
              />
              <span
                className="text-[10px] font-mono tracking-[0.08em]"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                {LEGEND_LABELS[k]}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh graph"
        className="pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium active:scale-95 cursor-pointer"
        style={{
          background:     "rgba(5,5,5,0.85)",
          border:         "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(8px)",
          color:          "rgba(255,255,255,0.40)",
          transition:     "color 200ms cubic-bezier(0.32,0.72,0,1), border-color 200ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.borderColor = "rgba(29,59,224,0.55)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
      >
        <svg
          width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden
          className={isProcessing ? "animate-spin" : ""}
        >
          <path d="M9.5 5.5A4 4 0 1 1 5.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M5.5 1.5L8 4M5.5 1.5l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {isProcessing ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
