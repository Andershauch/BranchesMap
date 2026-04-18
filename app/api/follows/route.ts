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
import {
  deleteSearchFollow,
  followMunicipalitySearch,
  markSearchFollowNotificationSeen,
} from "@/lib/server/search-follows";

/**
 * Form-post endpoint for follow mutations.
 *
 * Responsibilities:
 * - enforce same-origin POSTs
 * - require an authenticated user for write operations
 * - preserve locale-safe redirects for browser form flows
 * - record audit events for follow lifecycle changes
 *
 * The route intentionally returns redirects instead of JSON because the primary
 * caller is server-rendered forms in the citizen UI.
 */
function redirect303(url: URL) {
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    await recordSecurityEvent({
      action: "origin_rejected",
      entityType: "SearchFollow",
      metadata: {
        route: "/api/follows",
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
  const returnTo = parseSafeRedirectPath(locale, formData.get("returnTo"), `/${locale}/follows`);
  const user = await getCurrentUser();
  const intent = formData.get("intent");

  if (!user) {
    // Anonymous users are redirected into auth with a safe follow handoff so the
    // intended municipality action can continue after login or registration.
    if (intent === "follow-municipality") {
      const municipalitySlug = formData.get("municipalitySlug");
      const registerUrl = buildAppUrl(request, `/${locale}/register`);
      registerUrl.searchParams.set("redirectTo", returnTo);
      if (typeof municipalitySlug === "string" && municipalitySlug) {
        registerUrl.searchParams.set("followMunicipality", municipalitySlug);
      }
      return redirect303(registerUrl);
    }

    const loginUrl = buildAppUrl(request, `/${locale}/login`);
    loginUrl.searchParams.set("redirectTo", returnTo);
    return redirect303(loginUrl);
  }

  if (intent === "follow-municipality") {
    const municipalitySlug = formData.get("municipalitySlug");
    const redirectUrl = buildAppRedirectUrl(request, returnTo);

    if (typeof municipalitySlug === "string" && municipalitySlug) {
      if (!isSimpleSlug(municipalitySlug)) {
        redirectUrl.searchParams.set("followed", "error");
        return redirect303(redirectUrl);
      }

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
    const redirectUrl = buildAppRedirectUrl(request, returnTo);

    if (typeof followId === "string" && followId) {
      if (!isRecordId(followId)) {
        return redirect303(redirectUrl);
      }

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

  if (intent === "mark-seen") {
    const followId = formData.get("followId");
    const redirectUrl = buildAppRedirectUrl(request, returnTo);

    if (typeof followId === "string" && followId) {
      if (!isRecordId(followId)) {
        return redirect303(redirectUrl);
      }

      const marked = await markSearchFollowNotificationSeen({ userId: user.id, followId });

      if (marked) {
        await recordAuditEvent({
          userId: user.id,
          action: "search_follow.mark_seen",
          entityType: "SearchFollow",
          entityId: followId,
        });
        redirectUrl.searchParams.set("followMarkedSeen", "1");
      }
    }

    return redirect303(redirectUrl);
  }

  return redirect303(buildAppRedirectUrl(request, returnTo));
}
