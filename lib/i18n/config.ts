export const locales = ["da", "en", "uk", "ar", "fa", "ur", "pl", "de"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "da";

export function isValidLocale(locale: string): locale is AppLocale {
  return locales.includes(locale as AppLocale);
}

export const intlLocaleMap: Record<AppLocale, string> = {
  da: "da-DK",
  en: "en-US",
  uk: "uk-UA",
  ar: "ar",
  fa: "fa",
  ur: "ur",
  pl: "pl-PL",
  de: "de-DE",
};

export const rtlLocales = ["ar", "fa", "ur"] as const;

export function isRtlLocale(locale: AppLocale) {
  return rtlLocales.includes(locale as (typeof rtlLocales)[number]);
}
