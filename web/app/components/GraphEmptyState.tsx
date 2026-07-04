export default function GraphEmptyState() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-6 select-none pointer-events-none"
      style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(29,59,224,0.06) 0%, #050505 65%)",
      }}
    >
      <div style={{ filter: "drop-shadow(0 0 20px rgba(29,59,224,0.25))" }}>
        <svg width="80" height="80" viewBox="0 0 72 72" fill="none" aria-hidden style={{ opacity: 0.45 }}>
          <line x1="36" y1="36" x2="12" y2="12" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
          <line x1="36" y1="36" x2="60" y2="12" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
          <line x1="36" y1="36" x2="12" y2="60" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
          <line x1="36" y1="36" x2="60" y2="60" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
          <line x1="36" y1="36" x2="36" y2="10" stroke="#1d3be0" strokeWidth="0.8" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="5" stroke="#22c55e" strokeWidth="1.2" fill="rgba(34,197,94,0.08)"/>
          <circle cx="60" cy="12" r="5" stroke="#4f9cf9" strokeWidth="1.2" fill="rgba(79,156,249,0.08)"/>
          <circle cx="12" cy="60" r="5" stroke="#ef4444" strokeWidth="1.2" fill="rgba(239,68,68,0.08)"/>
          <circle cx="60" cy="60" r="5" stroke="#a78bfa" strokeWidth="1.2" fill="rgba(167,139,250,0.08)"/>
          <circle cx="36" cy="10" r="3.5" stroke="#1d3be0" strokeWidth="1"/>
          <circle cx="36" cy="36" r="9" stroke="#1d3be0" strokeWidth="1.2"/>
          <circle cx="36" cy="36" r="4.5" fill="#1d3be0" opacity="0.6"/>
          <circle cx="34" cy="34" r="1.5" fill="rgba(255,255,255,0.35)"/>
        </svg>
      </div>

      <div className="text-center space-y-2">
        <p
          className="text-[13px] font-semibold"
          style={{
            color: "rgba(255,255,255,0.45)",
            fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))",
          }}
        >
          Knowledge graph empty
        </p>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          Add a YouTube video or article in the{" "}
          <span style={{ color: "#4d68f5" }}>Add Source</span> tab.
        </p>
      </div>
    </div>
  );
}
