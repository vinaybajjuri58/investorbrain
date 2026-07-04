"use client";

export type ProcessingStatus = "processing" | "completed" | "idle";

interface Props {
  status: ProcessingStatus;
}

const STATUS_CONFIG = {
  processing: { dot: "#1d3be0", label: "processing", ring: true },
  completed:  { dot: "#22c55e", label: "ready",      ring: false },
  idle:       { dot: "#26262c", label: "idle",        ring: false },
} as const;

export default function StatusDot({ status }: Props) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0" aria-label={`Status: ${cfg.label}`}>
      <div className="relative w-2 h-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: cfg.dot }}
        />
        {cfg.ring && (
          <div
            className="absolute inset-0 rounded-full status-ring"
            style={{ background: cfg.dot }}
          />
        )}
      </div>
      <span
        className="text-[10px] font-mono tracking-[0.2em] uppercase tabular-nums"
        style={{ color: "#4d4d55" }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
