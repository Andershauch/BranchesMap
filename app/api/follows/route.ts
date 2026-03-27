import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { getSessionCookieName, getUserFromSessionToken } from "@/lib/server/auth";
import { deleteSearchFollow, followMunicipalitySearch } from "@/lib/server/search-follows";

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
  const returnTo = safeRedirectPath(locale, formData.get("returnTo"), `/${locale}/follows`);
  const sessionToken = request.cookies.get(getSessionCookieName())?.value;
  const user = await getUserFromSessionToken(sessionToken);
  const intent = formData.get("intent");

  if (!user) {
    if (intent === "follow-municipality") {
      const municipalitySlug = formData.get("municipalitySlug");
      const registerUrl = new URL(`/${locale}/register`, request.url);
      registerUrl.searchParams.set("redirectTo", returnTo);
      if (typeof municipalitySlug === "string" && municipalitySlug) {
        registerUrl.searchParams.set("followMunicipality", municipalitySlug);
      }
      return redirect303(registerUrl);
    }

    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirectTo", returnTo);
    return redirect303(loginUrl);
  }

  if (intent === "follow-municipality") {
    const municipalitySlug = formData.get("municipalitySlug");
    const redirectUrl = new URL(returnTo, request.url);

    if (typeof municipalitySlug === "string" && municipalitySlug) {
      const result = await followMunicipalitySearch({
        userId: user.id,
        municipalitySlug,
        locale,
      });

      if (result.ok) {
        await recordAuditEvent({
          userId: user.id,
          action: result.created ? "search_follow.create" : result.reactivated ? "search_follow.reactivate" : "search_follow.duplicate",
          entityType: "SearchFollow",
          entityId: result.follow.id,
          metadata: { municipalitySlug },
        });
        redirectUrl.searchParams.set("followed", result.created || result.reactivated ? "created" : "exists");
      } else {
        redirectUrl.searchParams.set("followed", "error");
      }
    } else {
      redirectUrl.searchParams.set("followed", "error");
    }

    return redirect303(redirectUrl);
  }

  if (intent === "delete") {
    const followId = formData.get("followId");
    const redirectUrl = new URL(returnTo, request.url);

    if (typeof followId === "string" && followId) {
      const deleted = await deleteSearchFollow({ userId: user.id, followId });

      if (deleted) {
        await recordAuditEvent({
          userId: user.id,
          action: "search_follow.delete",
          entityType: "SearchFollow",
          entityId: followId,
        });
        redirectUrl.searchParams.set("followDeleted", "1");
      }
    }

    return redirect303(redirectUrl);
  }

  return redirect303(new URL(returnTo, request.url));
}