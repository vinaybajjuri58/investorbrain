"use client";

export type ProcessingStatus = "processing" | "completed" | "idle";

interface Props {
  status: ProcessingStatus;
}

const STATUS_CONFIG = {
  processing: { dot: "#2563eb", label: "processing", ring: true },
  completed:  { dot: "#22c55e", label: "ready",      ring: false },
  idle:       { dot: "#1a3050", label: "idle",        ring: false },
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
        className="text-[9.5px] font-mono tracking-[0.1em] uppercase tabular-nums"
        style={{ color: "#2d4460" }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
