import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUser } from "@/lib/server/auth";
import { buildAppRedirectUrl, buildAppUrl } from "@/lib/server/request-origin";
import {
  deleteSearchFollow,
  followMunicipalitySearch,
  markSearchFollowNotificationSeen,
} from "@/lib/server/search-follows";

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
  const user = await getCurrentUser();
  const intent = formData.get("intent");

  if (!user) {
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
