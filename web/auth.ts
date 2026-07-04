import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  /**
   * trustHost: true — required when running behind a reverse proxy (Caddy)
   * in production. Tells Auth.js to trust the Host header rather than
   * requiring NEXTAUTH_URL / AUTH_URL to be set explicitly.
   */
  trustHost: true,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    /**
     * authorized — called by proxy.ts on every matched request.
     * Returns true  → let the request through.
     * Returns false → redirect to pages.signIn.
     */
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});
