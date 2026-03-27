import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { createSessionCookieValue, createSessionForUser } from "@/lib/server/auth";
import { authenticateUser } from "@/lib/server/users";

function getLocale(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? value : "da";
}

function safeRedirectPath(locale: string, requestedPath: FormDataEntryValue | null, fallback: string) {
  if (typeof requestedPath === "string" && requestedPath.startsWith(`/${locale}/`) && !requestedPath.startsWith("//")) {
    return requestedPath;
  }

  return fallback;
}

function redirect303(url: URL) {
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const locale = getLocale(formData.get("locale"));
  const redirectTo = safeRedirectPath(locale, formData.get("redirectTo"), `/${locale}/saved-searches`);
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("error", "missing_fields");
    url.searchParams.set("redirectTo", redirectTo);
    return redirect303(url);
  }

  const user = await authenticateUser({ email, password });

  if (!user) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("error", "invalid_credentials");
    url.searchParams.set("redirectTo", redirectTo);
    return redirect303(url);
  }

  const { sessionToken, expiresAt } = await createSessionForUser(user.id);
  await recordAuditEvent({
    userId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    metadata: { locale },
  });

  const response = redirect303(new URL(redirectTo, request.url));
  const cookie = createSessionCookieValue(sessionToken, expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}