import { type AppLocale } from "@/lib/i18n/config";
import { baseDictionaries, getBaseDictionarySync } from "@/lib/i18n/base-dictionaries";
import type { Dictionary } from "@/lib/i18n/schema";

export type { Dictionary };

export async function getDictionary(locale: AppLocale): Promise<Dictionary> {
  return baseDictionaries[locale];
}

export function getDictionarySync(locale: AppLocale | string): Dictionary {
  return getBaseDictionarySync(locale);
}
