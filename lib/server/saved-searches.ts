import "server-only";

import { getDictionarySync } from "@/lib/i18n/dictionaries";
import { prisma } from "@/lib/server/prisma";

export type SavedSearchListItem = {
  id: string;
  title: string;
  createdAt: Date;
  municipality: {
    slug: string;
    name: string;
  } | null;
};

function buildMunicipalitySearchTitle(name: string, locale: string) {
  return getDictionarySync(locale).titles.savedSearch.replace("{municipality}", name);
}

export async function saveMunicipalitySearch({
  userId,
  municipalitySlug,
  locale,
}: {
  userId: string;
  municipalitySlug: string;
  locale: string;
}) {
  const municipality = await prisma.municipality.findUnique({
    where: { slug: municipalitySlug },
    select: { id: true, slug: true, name: true },
  });

  if (!municipality) {
    return { ok: false as const, reason: "municipality_not_found" };
  }

  const existing = await prisma.savedSearch.findFirst({
    where: {
      userId,
      municipalityId: municipality.id,
      queryText: "municipality-profile",
    },
  });

  if (existing) {
    return { ok: true as const, created: false, savedSearch: existing };
  }

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId,
      title: buildMunicipalitySearchTitle(municipality.name, locale),
      queryText: "municipality-profile",
      municipalityId: municipality.id,
      filters: {
        source: "municipality-profile",
        municipalitySlug: municipality.slug,
      },
    },
  });

  return { ok: true as const, created: true, savedSearch };
}

export async function listSavedSearchesForUser(userId: string): Promise<SavedSearchListItem[]> {
  const items = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      municipality: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    createdAt: item.createdAt,
    municipality: item.municipality,
  }));
}

export async function deleteSavedSearch({ userId, savedSearchId }: { userId: string; savedSearchId: string }) {
  const savedSearch = await prisma.savedSearch.findFirst({
    where: {
      id: savedSearchId,
      userId,
    },
    select: { id: true },
  });

  if (!savedSearch) {
    return false;
  }

  await prisma.savedSearch.delete({ where: { id: savedSearch.id } });
  return true;
}
