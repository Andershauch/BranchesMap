import { NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit";
import {
  createClearedSessionCookieValue,
  deleteSessionByToken,
  getSessionCookieName,
  getUserFromSessionToken,
} from "@/lib/server/auth";
import { buildAppUrl } from "@/lib/server/request-origin";

function redirect303(url: URL) {
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const localeValue = formData.get("locale");
  const locale = typeof localeValue === "string" && localeValue ? localeValue : "da";
  const sessionToken = request.cookies.get(getSessionCookieName())?.value;
  const user = await getUserFromSessionToken(sessionToken);

  await deleteSessionByToken(sessionToken);

  if (user) {
    await recordAuditEvent({
      userId: user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
      metadata: { locale },
    });
  }

  const response = redirect303(buildAppUrl(request, `/${locale}`));
  const cookie = createClearedSessionCookieValue();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
