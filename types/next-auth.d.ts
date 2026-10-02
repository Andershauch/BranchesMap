import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      locale: string;
      role: "user" | "admin" | "superadmin";
      sessionVersion: number;
    };
  }

  interface User {
    locale: string;
    role: "user" | "admin" | "superadmin";
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    locale?: string;
    role?: "user" | "admin" | "superadmin";
    sessionVersion?: number;
  }
}
