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
     * Protect ONLY the dashboard subtree.
     * The root "/" is now a public landing page and must remain open.
     * API routes, static assets, and /signin are all implicitly excluded.
     */
    "/dashboard/:path*",
    "/dashboard",
  ],
};
