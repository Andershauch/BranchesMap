import "server-only";

import { cache } from "react";

import { type AppLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/schema";
import { getRuntimeDictionary as getRuntimeDictionaryInternal } from "@/lib/server/app-text-translations";

export const getRuntimeDictionary = cache(async (locale: AppLocale): Promise<Dictionary> => {
  return getRuntimeDictionaryInternal(locale);
});
