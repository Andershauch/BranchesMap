"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/server/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

function readLocale(formData: FormData) {
  const value = formData.get("locale");
  return typeof value === "string" && value ? value : "da";
}

export async function updateMunicipalityHomeMapAction(formData: FormData) {
  await requireAdminAuth();

  const locale = readLocale(formData);
  const slug = formData.get("slug");
  const visible = formData.get("visible") === "on";
  const priorityValue = formData.get("priority");
  const labelModeValue = formData.get("labelMode");
  const regionTagValue = formData.get("regionTag");

  if (typeof slug !== "string" || !slug) {
    throw new Error("Municipality slug is required.");
  }

  const priority =
    typeof priorityValue === "string" && priorityValue.trim() !== ""
      ? Math.min(999, Math.max(1, Number.parseInt(priorityValue, 10) || 999))
      : 999;

  const labelMode =
    typeof labelModeValue === "string" && ["auto", "name-only", "name-icons"].includes(labelModeValue)
      ? labelModeValue
      : "auto";

  const regionTag =
    typeof regionTagValue === "string" && ["west", "south", "central", "north", "metro", "other"].includes(regionTagValue)
      ? regionTagValue
      : "other";

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
