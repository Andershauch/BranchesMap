"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import { parseEnumValue } from "@/lib/server/input-validation";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { updateAppTextTranslation } from "@/lib/server/app-text-translations";

const editableLocales = locales;
const editableFilters = ["all", "missing", "overridden"] as const;

export async function updateAppTextTranslationAction(formData: FormData) {
  await requireAdminAuth();

  const pageLocaleValue = formData.get("pageLocale");
  if (typeof pageLocaleValue !== "string" || !isValidLocale(pageLocaleValue)) {
    throw new Error("Valid page locale is required.");
  }

  const pageLocale = pageLocaleValue as AppLocale;
  const targetLocale = parseEnumValue(formData.get("targetLocale"), editableLocales, "da");
  const key = formData.get("key");
  const value = formData.get("value");
  const queryValue = formData.get("query");
  const pageValue = formData.get("page");
  const query = typeof queryValue === "string" ? queryValue : "";
  const page = typeof pageValue === "string" ? pageValue : "1";
  const filter = parseEnumValue(formData.get("filter"), editableFilters, "all");

  if (typeof key !== "string" || !key.trim()) {
    throw new Error("Translation key is required.");
  }

  if (typeof value !== "string") {
    throw new Error("Translation value is required.");
  }

  await updateAppTextTranslation({
    key,
    locale: targetLocale as AppLocale,
    value,
  });

  revalidateTag("app-text-translations", "max");

  for (const locale of locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/login`);
    revalidatePath(`/${locale}/register`);
    revalidatePath(`/${locale}/follows`);
    revalidatePath(`/${locale}/saved-searches`);
    revalidatePath(`/${locale}/admin/app-texts`);
  }

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (targetLocale) params.set("target", targetLocale);
  if (filter) params.set("filter", filter);
  if (page && page !== "1") params.set("page", page);
  params.set("saved", "1");

  redirect(`/${pageLocale}/admin/app-texts?${params.toString()}`);
}
