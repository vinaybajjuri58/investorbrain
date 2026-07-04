"use client";

export type ProcessingStatus = "processing" | "completed" | "idle";

interface Props {
  status: ProcessingStatus;
}

const STATUS_CONFIG = {
  processing: { dot: "#f59e0b", label: "processing", ring: true },
  completed:  { dot: "#22c55e", label: "ready",      ring: false },
  idle:       { dot: "#253548", label: "idle",        ring: false },
} as const;

export default function StatusDot({ status }: Props) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0" aria-label={`Status: ${cfg.label}`}>
      <div className="relative w-2 h-2">
        {/* Core dot */}
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: cfg.dot }}
        />
        {/* Pulse ring — processing only */}
        {cfg.ring && (
          <div
            className="absolute inset-0 rounded-full status-ring"
            style={{ background: cfg.dot }}
          />
        )}
      </div>
      <span
        className="text-[10.5px] font-mono text-[#4a5c6e] tabular-nums"
        style={{ letterSpacing: "0.04em" }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
