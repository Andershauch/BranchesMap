"use server";

import { revalidatePath } from "next/cache";

import {
  isSimpleSlug,
  parseBoundedInt,
  parseEnumValue,
  parseLocaleValue,
} from "@/lib/server/input-validation";
import { prisma } from "@/lib/server/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

export async function updateMunicipalityHomeMapAction(formData: FormData) {
  await requireAdminAuth();

  const locale = parseLocaleValue(formData.get("locale"));
  const slug = formData.get("slug");
  const visible = formData.get("visible") === "on";

  if (typeof slug !== "string" || !isSimpleSlug(slug)) {
    throw new Error("Municipality slug is required.");
  }

  const priority = parseBoundedInt(formData.get("priority"), {
    fallback: 999,
    min: 1,
    max: 999,
  });

  const labelMode = parseEnumValue(
    formData.get("labelMode"),
    ["auto", "name-only", "name-icons"] as const,
    "auto",
  );

  const regionTag = parseEnumValue(
    formData.get("regionTag"),
    ["west", "south", "central", "north", "metro", "other"] as const,
    "other",
  );

  await prisma.municipality.update({
    where: { slug },
    data: {
      homeMapVisible: visible,
      homeMapPriority: priority,
      homeMapLabelMode: labelMode,
      homeMapRegionTag: regionTag,
    },
  });

  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/admin/home-map`);
}
