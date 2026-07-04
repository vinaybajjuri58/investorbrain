import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const metadata = {
  title: "Sign in — InvestorBrain",
};

export default async function SignInPage() {
  // Already authenticated → go straight to the dashboard
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% 0%, #2447f0 0%, #1d3be0 45%, #12279d 100%)",
      }}
    >
      <div className="w-full max-w-sm">

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          }}
        >

          {/* Logo + brand */}
          <div className="flex flex-col items-center gap-4 mb-8">
            {/* Knowledge-graph icon — matches landing nav */}
            <div
              className="p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <svg width="32" height="32" viewBox="0 0 20 20" fill="none" aria-hidden>
                <line x1="10" y1="10" x2="4"  y2="4"  stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="10" y1="10" x2="16" y2="4"  stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="10" y1="10" x2="4"  y2="16" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="10" y1="10" x2="16" y2="16" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <circle cx="4"  cy="4"  r="2"   fill="#22c55e"/>
                <circle cx="16" cy="4"  r="2"   fill="#4f9cf9"/>
                <circle cx="4"  cy="16" r="2"   fill="#ef4444"/>
                <circle cx="16" cy="16" r="2"   fill="#a78bfa"/>
                <circle cx="10" cy="10" r="3.5" fill="white"/>
                <circle cx="8.7" cy="8.7" r="1.1" fill="rgba(0,0,0,0.2)"/>
              </svg>
            </div>

            <div className="text-center">
              <h1
                className="text-[22px] font-semibold tracking-[-0.02em] text-white"
                style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
              >
                InvestorBrain
              </h1>
              <p className="mt-1 text-[11px] text-white/45 font-mono tracking-[0.14em] uppercase">
                bias-aware investing memory
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mb-6" style={{ background: "rgba(255,255,255,0.1)" }} />

          {/* Sign-in form — server action triggers Google OAuth */}
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className={[
                "w-full flex items-center justify-center gap-3",
                "px-4 py-3 rounded-xl",
                "bg-white hover:bg-[#f1f3f4] active:bg-[#e8eaed]",
                "text-[#1f1f1f] text-[14px] font-medium",
                "border border-[#dadce0]",
                "transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2",
                "shadow-sm",
              ].join(" ")}
            >
              {/* Official Google G logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-white/40 leading-relaxed">
            Your knowledge graph is private and stored on your own server.
            <br />
            No data is shared between accounts.
          </p>
        </div>
      </div>
    </main>
  );
}
