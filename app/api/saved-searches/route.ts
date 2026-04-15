import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUser } from "@/lib/server/auth";
import { buildAppRedirectUrl, buildAppUrl } from "@/lib/server/request-origin";
import { deleteSavedSearch, saveMunicipalitySearch } from "@/lib/server/saved-searches";

function getLocale(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? value : "da";
}

function isSimpleSlug(value: string) {
  return /^[a-z0-9-]{2,64}$/.test(value);
}

function isRecordId(value: string) {
  return /^[a-z0-9]{12,32}$/i.test(value);
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
  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = buildAppUrl(request, `/${locale}/login`);
    loginUrl.searchParams.set("redirectTo", returnTo);
    return redirect303(loginUrl);
  }

  const intent = formData.get("intent");

  if (intent === "save-municipality") {
    const municipalitySlug = formData.get("municipalitySlug");
    const redirectUrl = buildAppRedirectUrl(request, returnTo);

    if (typeof municipalitySlug === "string" && municipalitySlug) {
      if (!isSimpleSlug(municipalitySlug)) {
        redirectUrl.searchParams.set("saved", "error");
        return redirect303(redirectUrl);
      }

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
    const redirectUrl = buildAppRedirectUrl(request, returnTo);

    if (typeof savedSearchId === "string" && savedSearchId) {
      if (!isRecordId(savedSearchId)) {
        return redirect303(redirectUrl);
      }

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

  return redirect303(buildAppRedirectUrl(request, returnTo));
}
