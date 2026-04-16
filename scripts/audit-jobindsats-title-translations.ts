import {
  arJobindsatsTitleTranslations,
  deJobindsatsTitleTranslations,
  enJobindsatsTitleTranslations,
  faJobindsatsTitleTranslations,
  plJobindsatsTitleTranslations,
  type JobindsatsTitleKey,
  ukJobindsatsTitleTranslations,
  urJobindsatsTitleTranslations,
} from "../lib/i18n/generated/jobindsats-title-translations";

type SupportedLocale = "ar" | "de" | "fa" | "pl" | "uk" | "ur";

const localeMaps: Record<SupportedLocale, Partial<Record<JobindsatsTitleKey, string>>> = {
  ar: arJobindsatsTitleTranslations,
  de: deJobindsatsTitleTranslations,
  fa: faJobindsatsTitleTranslations,
  pl: plJobindsatsTitleTranslations,
  uk: ukJobindsatsTitleTranslations,
  ur: urJobindsatsTitleTranslations,
};

function parseLocaleArg(): SupportedLocale | null {
  const localeArg = process.argv.find((arg) => arg.startsWith("--locale="));

  if (!localeArg) {
    return null;
  }

  const locale = localeArg.slice("--locale=".length) as SupportedLocale;
  return locale in localeMaps ? locale : null;
}

function printAuditForLocale(locale: SupportedLocale) {
  const overrides = localeMaps[locale];
  const keys = Object.keys(enJobindsatsTitleTranslations) as JobindsatsTitleKey[];
  const missing = keys.filter((key) => !overrides[key]);

  console.log(`Locale: ${locale}`);
  console.log(`English master keys: ${keys.length}`);
  console.log(`Locale overrides: ${keys.length - missing.length}`);
  console.log(`Missing overrides: ${missing.length}`);
  console.log("");

  for (const key of missing) {
    console.log(`- ${key}`);
  }
}

function main() {
  const locale = parseLocaleArg();

  if (locale) {
    printAuditForLocale(locale);
    return;
  }

  (Object.keys(localeMaps) as SupportedLocale[]).forEach((supportedLocale, index) => {
    if (index > 0) {
      console.log("");
    }

    printAuditForLocale(supportedLocale);
  });
}

main();
