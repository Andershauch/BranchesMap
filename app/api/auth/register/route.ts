import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { createSessionCookieValue, createSessionForUser } from "@/lib/server/auth";
import { registerUser } from "@/lib/server/users";

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
  const name = formData.get("name");

  if (typeof email !== "string" || typeof password !== "string") {
    const url = new URL(`/${locale}/register`, request.url);
    url.searchParams.set("error", "missing_fields");
    url.searchParams.set("redirectTo", redirectTo);
    return redirect303(url);
  }

  const result = await registerUser({
    email,
    password,
    name: typeof name === "string" ? name : undefined,
    locale,
  });

  if (!result.ok) {
    const url = new URL(`/${locale}/register`, request.url);
    url.searchParams.set("error", result.reason);
    url.searchParams.set("redirectTo", redirectTo);
    return redirect303(url);
  }

  const { sessionToken, expiresAt } = await createSessionForUser(result.user.id);
  await recordAuditEvent({
    userId: result.user.id,
    action: "auth.register",
    entityType: "User",
    entityId: result.user.id,
    metadata: { locale },
  });

  const response = redirect303(new URL(redirectTo, request.url));
  const cookie = createSessionCookieValue(sessionToken, expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}