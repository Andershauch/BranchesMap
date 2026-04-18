"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AppLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/schema";

type DictionaryContextValue = {
  locale: AppLocale;
  dictionary: Dictionary;
};

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  locale,
  dictionary,
  children,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={{ locale, dictionary }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  const context = useContext(DictionaryContext);

  if (!context) {
    throw new Error("useDictionary must be used within a DictionaryProvider.");
  }

  return context.dictionary;
}

export function useDictionaryLocale() {
  const context = useContext(DictionaryContext);

  if (!context) {
    throw new Error("useDictionaryLocale must be used within a DictionaryProvider.");
  }

  return context.locale;
}
