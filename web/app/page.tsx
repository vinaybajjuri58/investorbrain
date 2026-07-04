import { auth } from "@/auth";
import LandingNav from "@/app/components/landing/LandingNav";
import Hero from "@/app/components/landing/Hero";
// The four sections below are created by a parallel agent — TS errors for
// missing modules here are expected and should be ignored during type-check.
import FoundationSection from "@/app/components/landing/FoundationSection";
import MemorySuite from "@/app/components/landing/MemorySuite";
import ClosingCta from "@/app/components/landing/ClosingCta";
import LandingFooter from "@/app/components/landing/LandingFooter";

export default async function LandingPage() {
  const session = await auth();
  const isAuthed = !!session?.user;

  // html/body have overflow:hidden + height:100% — the landing page scrolls
  // via this inner h-full overflow-y-auto wrapper.
  return (
    <div className="h-full overflow-y-auto" style={{ background: "#1d3be0" }}>
      <LandingNav isAuthed={isAuthed} />
      <Hero isAuthed={isAuthed} />
      <FoundationSection />
      <MemorySuite />
      <ClosingCta />
      <LandingFooter />
    </div>
  );
}
