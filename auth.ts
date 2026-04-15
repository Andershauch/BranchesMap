import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authenticateUser } from "@/lib/server/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await authenticateUser({ email, password });
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          locale: user.locale,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.locale = user.locale;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.sub || !session.user?.email) {
        return session;
      }

      session.user.id = token.sub;
      session.user.email = token.email ?? session.user.email;
      session.user.name = typeof token.name === "string" ? token.name : session.user.name;
      session.user.locale = typeof token.locale === "string" ? token.locale : "da";
      session.user.role = token.role === "admin" ? "admin" : "user";

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        const origin = new URL(baseUrl);

        if (target.origin === origin.origin) {
          return target.toString();
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },
});
