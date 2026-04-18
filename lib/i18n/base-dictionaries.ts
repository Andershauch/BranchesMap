import { defaultLocale, isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { arDictionary } from "@/lib/i18n/dictionaries/ar";
import { daDictionary } from "@/lib/i18n/dictionaries/da";
import { deDictionary } from "@/lib/i18n/dictionaries/de";
import { enDictionary } from "@/lib/i18n/dictionaries/en";
import { faDictionary } from "@/lib/i18n/dictionaries/fa";
import { plDictionary } from "@/lib/i18n/dictionaries/pl";
import { ukDictionary } from "@/lib/i18n/dictionaries/uk";
import { urDictionary } from "@/lib/i18n/dictionaries/ur";
import type { Dictionary } from "@/lib/i18n/schema";

export const baseDictionaries: Record<AppLocale, Dictionary> = {
  da: daDictionary,
  en: enDictionary,
  uk: ukDictionary,
  ar: arDictionary,
  fa: faDictionary,
  ur: urDictionary,
  pl: plDictionary,
  de: deDictionary,
};

export function getBaseDictionarySync(locale: AppLocale | string): Dictionary {
  return baseDictionaries[isValidLocale(locale) ? locale : defaultLocale];
}
