"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentSuperAdminUser } from "@/lib/server/auth";
import { requireSuperAdminAuth } from "@/lib/server/admin-auth";
import { parseEnumValue, parseNormalizedEmail, parseOptionalString } from "@/lib/server/input-validation";
import {
  updateUserActiveState,
  updateUserAdminRole,
} from "@/lib/server/users";
import { createUserInvitation } from "@/lib/server/user-invitations";

function buildParams(input: {
  query: string;
  page: string;
  saved?: boolean;
  created?: boolean;
  error?: string;
}) {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.page && input.page !== "1") params.set("page", input.page);
  if (input.saved) params.set("saved", "1");
  if (input.created) params.set("created", "1");
  if (input.error) params.set("error", input.error);
  return params;
}

export async function createUserInvitationAction(formData: FormData) {
  await requireSuperAdminAuth();

  const adminUser = await getCurrentSuperAdminUser();
  const pageLocaleValue = formData.get("pageLocale");
  const email = parseNormalizedEmail(formData.get("email"));
  const name = parseOptionalString(formData.get("name"));
  const locale = parseOptionalString(formData.get("locale")) ?? "da";
  const role = parseEnumValue(formData.get("role"), ["user", "admin"] as const, "user");
  const queryValue = formData.get("query");
  const pageValue = formData.get("page");

  if (typeof pageLocaleValue !== "string" || !pageLocaleValue) {
    throw new Error("Valid page locale is required.");
  }

  const query = typeof queryValue === "string" ? queryValue : "";
  const page = typeof pageValue === "string" ? pageValue : "1";

  if (!email) {
    const params = buildParams({
      query,
      page,
      error: "E-mail er påkrævet.",
    });
    redirect(`/${pageLocaleValue}/admin/users?${params.toString()}`);
  }

  try {
    const result = await createUserInvitation({
      email,
      name: name ?? undefined,
      locale,
      role,
      invitedByUserId: adminUser?.id ?? "",
    });

    if (!result.ok) {
      throw new Error(
        "Der findes allerede en bruger med den e-mail.",
      );
    }

    await recordAuditEvent({
      userId: adminUser?.id ?? null,
      action: "admin.user_invited",
      entityType: "UserInvitation",
      entityId: result.invitation.id,
      metadata: {
        email,
        role,
        locale,
      },
    });
  } catch (error) {
    const params = buildParams({
      query,
      page,
      error: error instanceof Error ? error.message : "Kunne ikke sende invitation.",
    });
    redirect(`/${pageLocaleValue}/admin/users?${params.toString()}`);
  }

  revalidatePath(`/${pageLocaleValue}/admin`);
  revalidatePath(`/${pageLocaleValue}/admin/users`);

  const params = buildParams({
    query,
    page,
    created: true,
  });
  redirect(`/${pageLocaleValue}/admin/users?${params.toString()}`);
}

export async function updateUserRoleAction(formData: FormData) {
  await requireSuperAdminAuth();

  const adminUser = await getCurrentSuperAdminUser();
  const pageLocaleValue = formData.get("pageLocale");
  const targetUserId = formData.get("targetUserId");
  const intent = formData.get("intent");
  const queryValue = formData.get("query");
  const pageValue = formData.get("page");

  if (typeof pageLocaleValue !== "string" || !pageLocaleValue) {
    throw new Error("Valid page locale is required.");
  }

  if (typeof targetUserId !== "string" || !targetUserId) {
    throw new Error("Target user is required.");
  }

  if (intent !== "promote-admin" && intent !== "demote-admin") {
    throw new Error("Valid user role action is required.");
  }

  const query = typeof queryValue === "string" ? queryValue : "";
  const page = typeof pageValue === "string" ? pageValue : "1";

  try {
    const result = await updateUserAdminRole({
      actorUserId: adminUser?.id ?? "",
      targetUserId,
      makeAdmin: intent === "promote-admin",
    });

    if (result.updated) {
      await recordAuditEvent({
        userId: adminUser?.id ?? null,
        action: result.nextRole === "admin" ? "admin.user_promoted" : "admin.user_demoted",
        entityType: "User",
        entityId: result.user.id,
        metadata: {
          email: result.user.email,
          previousRole: result.previousRole,
          nextRole: result.nextRole,
        },
      });
    }
  } catch (error) {
    const params = buildParams({
      query,
      page,
      error: error instanceof Error ? error.message : "Unable to update user role.",
    });
    redirect(`/${pageLocaleValue}/admin/users?${params.toString()}`);
  }

  revalidatePath(`/${pageLocaleValue}/admin`);
  revalidatePath(`/${pageLocaleValue}/admin/users`);

  const params = buildParams({
    query,
    page,
    saved: true,
  });
  redirect(`/${pageLocaleValue}/admin/users?${params.toString()}`);
}

export async function updateUserActiveStateAction(formData: FormData) {
  await requireSuperAdminAuth();

  const adminUser = await getCurrentSuperAdminUser();
  const pageLocaleValue = formData.get("pageLocale");
  const targetUserId = formData.get("targetUserId");
  const intent = formData.get("intent");
  const queryValue = formData.get("query");
  const pageValue = formData.get("page");

  if (typeof pageLocaleValue !== "string" || !pageLocaleValue) {
    throw new Error("Valid page locale is required.");
  }

  if (typeof targetUserId !== "string" || !targetUserId) {
    throw new Error("Target user is required.");
  }

  if (intent !== "deactivate-user" && intent !== "reactivate-user") {
    throw new Error("Valid user state action is required.");
  }

  const query = typeof queryValue === "string" ? queryValue : "";
  const page = typeof pageValue === "string" ? pageValue : "1";

  try {
    const result = await updateUserActiveState({
      actorUserId: adminUser?.id ?? "",
      targetUserId,
      isActive: intent === "reactivate-user",
    });

    if (result.updated) {
      await recordAuditEvent({
        userId: adminUser?.id ?? null,
        action: result.nextIsActive ? "admin.user_reactivated" : "admin.user_deactivated",
        entityType: "User",
        entityId: result.user.id,
        metadata: {
          email: result.user.email,
          previousIsActive: result.previousIsActive,
          nextIsActive: result.nextIsActive,
        },
      });
    }
  } catch (error) {
    const params = buildParams({
      query,
      page,
      error: error instanceof Error ? error.message : "Unable to update user status.",
    });
    redirect(`/${pageLocaleValue}/admin/users?${params.toString()}`);
  }

  revalidatePath(`/${pageLocaleValue}/admin`);
  revalidatePath(`/${pageLocaleValue}/admin/users`);

  const params = buildParams({
    query,
    page,
    saved: true,
  });
  redirect(`/${pageLocaleValue}/admin/users?${params.toString()}`);
}
