import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { getSessionCookieName, getUserFromSessionToken } from "@/lib/server/auth";
import { deleteSavedSearch, saveMunicipalitySearch } from "@/lib/server/saved-searches";

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
  const returnTo = safeRedirectPath(locale, formData.get("returnTo"), `/${locale}/saved-searches`);
  const sessionToken = request.cookies.get(getSessionCookieName())?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirectTo", returnTo);
    return redirect303(loginUrl);
  }

  const intent = formData.get("intent");

  if (intent === "save-municipality") {
    const municipalitySlug = formData.get("municipalitySlug");
    const redirectUrl = new URL(returnTo, request.url);

    if (typeof municipalitySlug === "string" && municipalitySlug) {
      const result = await saveMunicipalitySearch({
        userId: user.id,
        municipalitySlug,
        locale,
      });

      if (result.ok) {
        await recordAuditEvent({
          userId: user.id,
          action: result.created ? "saved_search.create" : "saved_search.duplicate",
          entityType: "SavedSearch",
          entityId: result.savedSearch.id,
          metadata: { municipalitySlug },
        });
        redirectUrl.searchParams.set("saved", result.created ? "created" : "exists");
      } else {
        redirectUrl.searchParams.set("saved", "error");
      }
    } else {
      redirectUrl.searchParams.set("saved", "error");
    }

    return redirect303(redirectUrl);
  }

  if (intent === "delete") {
    const savedSearchId = formData.get("savedSearchId");
    const redirectUrl = new URL(returnTo, request.url);

    if (typeof savedSearchId === "string" && savedSearchId) {
      const deleted = await deleteSavedSearch({ userId: user.id, savedSearchId });

      if (deleted) {
        await recordAuditEvent({
          userId: user.id,
          action: "saved_search.delete",
          entityType: "SavedSearch",
          entityId: savedSearchId,
        });
        redirectUrl.searchParams.set("savedSearchDeleted", "1");
      }
    }

    return redirect303(redirectUrl);
  }

  return redirect303(new URL(returnTo, request.url));
}