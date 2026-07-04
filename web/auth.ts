import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const authObj = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});

export const { handlers, auth, signIn } = authObj;
