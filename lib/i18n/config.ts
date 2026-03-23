export const locales = ["da", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "da";

export function isValidLocale(locale: string): locale is AppLocale {
  return locales.includes(locale as AppLocale);
}

export const intlLocaleMap: Record<AppLocale, string> = {
  da: "da-DK",
  en: "en-US",
};