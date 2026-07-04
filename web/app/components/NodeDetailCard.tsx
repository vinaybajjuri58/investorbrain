import { type GraphNode, nodeColour } from "@/app/components/graphTypes";

export type SelectedNode = Pick<GraphNode, "id" | "label" | "type">;

interface Props {
  selected: SelectedNode;
  onDismiss: () => void;
}

export default function NodeDetailCard({ selected, onDismiss }: Props) {
  return (
    <div
      className="absolute top-3 left-3 z-20 p-[5px] rounded-2xl"
      style={{
        background: "rgba(5,5,5,0.95)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(6px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="relative rounded-[13px] px-4 pt-3.5 pb-3 max-w-[220px]"
        style={{
          background: "#0f0f12",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss node detail"
          className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-md cursor-pointer"
          style={{
            color: "rgba(255,255,255,0.30)",
            transition: "color 150ms cubic-bezier(0.32,0.72,0,1), background 150ms cubic-bezier(0.32,0.72,0,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.30)"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
            <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        <p className="text-[9px] font-mono uppercase tracking-[0.16em] mb-1.5" style={{ color: "rgba(255,255,255,0.30)" }}>
          {selected.type}
        </p>

        <p className="font-semibold text-[13px] leading-snug pr-5" style={{ color: "#ffffff" }}>
          {selected.label}
        </p>

        <div
          className="mt-3 h-[2px] rounded-full"
          style={{ background: nodeColour(selected.type), boxShadow: `0 0 6px ${nodeColour(selected.type)}88` }}
        />
      </div>
    </div>
  );
}
