import "server-only";

import { prisma } from "@/lib/server/prisma";

export type SearchFollowListItem = {
  id: string;
  title: string;
  isActive: boolean;
  notificationChannel: string;
  createdAt: Date;
  municipality: {
    slug: string;
    name: string;
  } | null;
};

function buildMunicipalityFollowTitle(name: string, locale: string) {
  return locale === "da" ? `${name} \u00b7 f\u00f8lg opdateringer` : `${name} \u00b7 follow updates`;
}

export async function followMunicipalitySearch({
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

  const existing = await prisma.searchFollow.findFirst({
    where: {
      userId,
      municipalityId: municipality.id,
      queryText: "municipality-profile",
    },
  });

  if (existing) {
    if (!existing.isActive) {
      const reactivated = await prisma.searchFollow.update({
        where: { id: existing.id },
        data: { isActive: true },
      });

      return { ok: true as const, created: false, reactivated: true, follow: reactivated };
    }

    return { ok: true as const, created: false, reactivated: false, follow: existing };
  }

  const follow = await prisma.searchFollow.create({
    data: {
      userId,
      title: buildMunicipalityFollowTitle(municipality.name, locale),
      queryText: "municipality-profile",
      municipalityId: municipality.id,
      notificationChannel: "in_app",
      filters: {
        source: "municipality-profile",
        municipalitySlug: municipality.slug,
      },
    },
  });

  return { ok: true as const, created: true, reactivated: false, follow };
}

export async function listSearchFollowsForUser(userId: string): Promise<SearchFollowListItem[]> {
  const items = await prisma.searchFollow.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
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
    isActive: item.isActive,
    notificationChannel: item.notificationChannel,
    createdAt: item.createdAt,
    municipality: item.municipality,
  }));
}

export async function deleteSearchFollow({ userId, followId }: { userId: string; followId: string }) {
  const follow = await prisma.searchFollow.findFirst({
    where: {
      id: followId,
      userId,
    },
    select: { id: true },
  });

  if (!follow) {
    return false;
  }

  await prisma.searchFollow.delete({ where: { id: follow.id } });
  return true;
}

export async function getMunicipalitySearchStateForUser({
  userId,
  municipalitySlug,
}: {
  userId: string;
  municipalitySlug: string;
}) {
  const municipality = await prisma.municipality.findUnique({
    where: { slug: municipalitySlug },
    select: { id: true },
  });

  if (!municipality) {
    return { isSaved: false, isFollowing: false };
  }

  const [saved, follow] = await Promise.all([
    prisma.savedSearch.findFirst({
      where: {
        userId,
        municipalityId: municipality.id,
        queryText: "municipality-profile",
      },
      select: { id: true },
    }),
    prisma.searchFollow.findFirst({
      where: {
        userId,
        municipalityId: municipality.id,
        queryText: "municipality-profile",
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  return {
    isSaved: Boolean(saved),
    isFollowing: Boolean(follow),
  };
}