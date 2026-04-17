"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { parseEnumValue } from "@/lib/server/input-validation";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { updateJobindsatsTitleTranslation } from "@/lib/server/jobindsats-title-translations";

const editableLocales = ["en", "uk", "ar", "fa", "ur", "pl", "de"] as const;
const editableFilters = ["all", "missing", "new"] as const;

export async function updateJobindsatsTitleTranslationAction(formData: FormData) {
  await requireAdminAuth();

  const pageLocaleValue = formData.get("pageLocale");
  if (typeof pageLocaleValue !== "string" || !isValidLocale(pageLocaleValue)) {
    throw new Error("Valid page locale is required.");
  }

  const pageLocale = pageLocaleValue as AppLocale;
  const targetLocale = parseEnumValue(formData.get("targetLocale"), editableLocales, "en");
  const daKey = formData.get("daKey");
  const value = formData.get("value");
  const queryValue = formData.get("query");
  const pageValue = formData.get("page");
  const query = typeof queryValue === "string" ? queryValue : "";
  const page = typeof pageValue === "string" ? pageValue : "1";
  const filterValue = formData.get("filter");
  const filter = parseEnumValue(filterValue, editableFilters, "all");

  if (typeof daKey !== "string" || !daKey.trim()) {
    throw new Error("Danish title key is required.");
  }

  if (typeof value !== "string") {
    throw new Error("Translation value is required.");
  }

  await updateJobindsatsTitleTranslation({
    daKey,
    locale: targetLocale as Exclude<AppLocale, "da">,
    value,
  });

  revalidateTag("jobindsats-title-translations", "max");
  revalidatePath(`/${pageLocale}/admin/jobindsats-titles`);
  revalidatePath(`/${pageLocale}/kommuner/[slug]`);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (targetLocale) params.set("target", targetLocale);
  if (filter) params.set("filter", filter);
  if (page && page !== "1") params.set("page", page);
  params.set("saved", "1");

  redirect(`/${pageLocale}/admin/jobindsats-titles?${params.toString()}`);
}
