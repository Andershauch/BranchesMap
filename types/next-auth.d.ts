import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      locale: string;
      role: "user" | "admin";
    };
  }

  interface User {
    locale: string;
    role: "user" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    locale?: string;
    role?: "user" | "admin";
  }
}
