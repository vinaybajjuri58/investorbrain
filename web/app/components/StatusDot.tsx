"use client";

export type ProcessingStatus = "processing" | "completed" | "idle";

interface Props {
  status: ProcessingStatus;
}

export default function StatusDot({ status }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div className="relative w-2 h-2">
        <div
          className={`w-2 h-2 rounded-full ${
            status === "processing"
              ? "bg-amber-400"
              : status === "completed"
              ? "bg-emerald-400"
              : "bg-[#30363d]"
          }`}
        />
        {status === "processing" && (
          <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-60" />
        )}
      </div>
      <span className="text-[11px] font-mono text-[#6e7681]">
        {status === "processing"
          ? "processing"
          : status === "completed"
          ? "ready"
          : "idle"}
      </span>
    </div>
  );
}
