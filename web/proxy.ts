/**
 * Next.js 16 Proxy (renamed from middleware).
 * Export auth as proxy so Auth.js can intercept requests, read the session
 * cookie, and redirect unauthenticated users to /signin.
 *
 * The authorized() callback in auth.ts decides whether a request is allowed.
 * API routes are excluded from this matcher — they return 401 JSON themselves.
 */
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   /signin              — the public sign-in page
     *   /api/*               — API routes check their own session (401 JSON)
     *   /_next/static        — Next.js build assets
     *   /_next/image         — image optimisation
     *   /favicon.ico         — static asset
     */
    "/((?!signin|api|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
