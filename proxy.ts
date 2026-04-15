import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { defaultLocale, isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import { applySecurityHeaders } from "@/lib/server/security";

function getPreferredLocale(request: NextRequest): AppLocale {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptedLanguages = request.headers
    .get("accept-language")
    ?.split(",")
    .map((value) => value.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean) ?? [];

  for (const language of acceptedLanguages) {
    if (language.startsWith("da")) {
      return "da";
    }

    if (language.startsWith("en")) {
      return "en";
    }
  }

  return defaultLocale;
}

function cookieOptions(request: NextRequest) {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRequest = pathname === "/api" || pathname.startsWith("/api/");
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!isApiRequest && !pathnameHasLocale) {
    const locale = getPreferredLocale(request);
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = `/${locale}${pathname}`;

    const response = applySecurityHeaders(NextResponse.redirect(nextUrl));
    response.cookies.set("NEXT_LOCALE", locale, cookieOptions(request));

    return response;
  }

  const localeInPath = pathname.split("/")[1];
  const response = applySecurityHeaders(NextResponse.next());

  if (localeInPath && isValidLocale(localeInPath)) {
    response.cookies.set("NEXT_LOCALE", localeInPath, cookieOptions(request));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
