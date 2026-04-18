import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUser } from "@/lib/server/auth";
import {
  isRecordId,
  isSimpleSlug,
  parseLocaleValue,
  parseSafeRedirectPath,
} from "@/lib/server/input-validation";
import { isTrustedMutationRequest } from "@/lib/server/origin-guard";
import { buildAppRedirectUrl, buildAppUrl } from "@/lib/server/request-origin";
import { recordSecurityEvent } from "@/lib/server/security-events";
import { jsonSecurityResponse } from "@/lib/server/security";
import { deleteSavedSearch, saveMunicipalitySearch } from "@/lib/server/saved-searches";

/**
 * Form-post endpoint for saved-search mutations.
 *
 * It mirrors the follow route structure:
 * - reject untrusted origins
 * - redirect anonymous users into login
 * - validate IDs and slugs before storage writes
 * - record audit events for create/delete actions
 */
function redirect303(url: URL) {
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    await recordSecurityEvent({
      action: "origin_rejected",
      entityType: "SavedSearch",
      metadata: {
        route: "/api/saved-searches",
      },
    });

    return jsonSecurityResponse(
      {
        ok: false,
        error: "Untrusted request origin.",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const locale = parseLocaleValue(formData.get("locale"));
  const returnTo = parseSafeRedirectPath(locale, formData.get("returnTo"), `/${locale}/saved-searches`);
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
