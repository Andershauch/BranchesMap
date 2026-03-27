import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { createSessionCookieValue, createSessionForUser } from "@/lib/server/auth";
import { followMunicipalitySearch } from "@/lib/server/search-follows";
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
  const followMunicipality = formData.get("followMunicipality");

  if (typeof email !== "string" || typeof password !== "string") {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("error", "missing_fields");
    url.searchParams.set("redirectTo", redirectTo);
    if (typeof followMunicipality === "string" && followMunicipality) {
      url.searchParams.set("followMunicipality", followMunicipality);
    }
    return redirect303(url);
  }

  const user = await authenticateUser({ email, password });

  if (!user) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("error", "invalid_credentials");
    url.searchParams.set("redirectTo", redirectTo);
    if (typeof followMunicipality === "string" && followMunicipality) {
      url.searchParams.set("followMunicipality", followMunicipality);
    }
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

  const finalRedirect = new URL(redirectTo, request.url);

  if (typeof followMunicipality === "string" && followMunicipality) {
    const followResult = await followMunicipalitySearch({
      userId: user.id,
      municipalitySlug: followMunicipality,
      locale,
    });

    if (followResult.ok) {
      await recordAuditEvent({
        userId: user.id,
        action: followResult.created ? "search_follow.create" : followResult.reactivated ? "search_follow.reactivate" : "search_follow.duplicate",
        entityType: "SearchFollow",
        entityId: followResult.follow.id,
        metadata: { municipalitySlug: followMunicipality, via: "login" },
      });
      finalRedirect.searchParams.set("followed", followResult.created || followResult.reactivated ? "created" : "exists");
    } else {
      finalRedirect.searchParams.set("followed", "error");
    }
  }

  const response = redirect303(finalRedirect);
  const cookie = createSessionCookieValue(sessionToken, expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}