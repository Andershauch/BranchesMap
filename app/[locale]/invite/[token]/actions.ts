"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { parseLocaleValue, parseOptionalString } from "@/lib/server/input-validation";
import { acceptUserInvitation } from "@/lib/server/user-invitations";

function withParams(pathname: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function acceptInvitationAction(formData: FormData) {
  const locale = parseLocaleValue(formData.get("locale"));
  const token = parseOptionalString(formData.get("token"));
  const password = parseOptionalString(formData.get("password"));

  if (!token || !password) {
    redirect(withParams(`/${locale}/invite/${token ?? ""}`, { error: "missing_fields" }));
  }

  const result = await acceptUserInvitation({ token, password });

  if (!result.ok) {
    redirect(
      withParams(`/${locale}/invite/${token}`, {
        error: result.reason,
      }),
    );
  }

  await recordAuditEvent({
    userId: result.user.id,
    action: "auth.invitation_accepted",
    entityType: "UserInvitation",
    entityId: result.invitation.id,
    metadata: {
      email: result.user.email,
      role: result.user.role,
      locale,
    },
  });

  await signIn("credentials", {
    email: result.user.email,
    password,
    redirectTo: result.user.role === "admin" ? `/${locale}/admin` : `/${locale}/follows`,
  });
}
