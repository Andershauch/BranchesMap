import "server-only";

import { prisma } from "@/lib/server/prisma";
import { buildMunicipalityFollowSnapshotWithHash } from "@/lib/server/search-follow-snapshots";

export type SearchFollowListItem = {
  id: string;
  title: string;
  isActive: boolean;
  notificationChannel: string;
  createdAt: Date;
  lastCheckedAt: Date | null;
  lastNotifiedAt: Date | null;
  hasUnreadUpdate: boolean;
  municipality: {
    slug: string;
    name: string;
  } | null;
};

export type SearchFollowCheckStatus =
  | "baseline_initialized"
  | "changed"
  | "unchanged"
  | "unsupported"
  | "missing_municipality";

export type SearchFollowCheckResult =
  | {
      ok: true;
      followId: string;
      status: SearchFollowCheckStatus;
      checkedAt: Date;
      hash: string | null;
    }
  | {
      ok: false;
      reason: "follow_not_found";
      followId: string;
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
    lastCheckedAt: item.lastCheckedAt,
    lastNotifiedAt: item.lastNotifiedAt,
    hasUnreadUpdate: Boolean(item.lastNotifiedAt),
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

export async function listFollowedMunicipalitySlugsForUser(userId: string) {
  const follows = await prisma.searchFollow.findMany({
    where: {
      userId,
      isActive: true,
      queryText: "municipality-profile",
      municipalityId: {
        not: null,
      },
    },
    select: {
      municipality: {
        select: {
          slug: true,
        },
      },
    },
  });

  return follows
    .map((follow) => follow.municipality?.slug)
    .filter((slug): slug is string => Boolean(slug));
}

export async function listUnreadFollowMunicipalitySlugsForUser(userId: string) {
  const follows = await prisma.searchFollow.findMany({
    where: {
      userId,
      isActive: true,
      queryText: "municipality-profile",
      municipalityId: {
        not: null,
      },
      lastNotifiedAt: {
        not: null,
      },
    },
    select: {
      municipality: {
        select: {
          slug: true,
        },
      },
    },
  });

  return [...new Set(follows.map((follow) => follow.municipality?.slug).filter((slug): slug is string => Boolean(slug)))];
}

export async function checkSearchFollow({
  followId,
  userId,
}: {
  followId: string;
  userId?: string;
}): Promise<SearchFollowCheckResult> {
  const follow = await prisma.searchFollow.findFirst({
    where: {
      id: followId,
      ...(userId ? { userId } : {}),
    },
    include: {
      municipality: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!follow) {
    return {
      ok: false,
      reason: "follow_not_found",
      followId,
    };
  }

  const checkedAt = new Date();

  if (follow.queryText !== "municipality-profile" || !follow.municipality?.slug) {
    await prisma.searchFollow.update({
      where: { id: follow.id },
      data: { lastCheckedAt: checkedAt },
    });

    return {
      ok: true,
      followId: follow.id,
      status: follow.municipality ? "unsupported" : "missing_municipality",
      checkedAt,
      hash: null,
    };
  }

  const snapshot = await buildMunicipalityFollowSnapshotWithHash(follow.municipality.slug);

  if (!snapshot) {
    await prisma.searchFollow.update({
      where: { id: follow.id },
      data: { lastCheckedAt: checkedAt },
    });

    return {
      ok: true,
      followId: follow.id,
      status: "missing_municipality",
      checkedAt,
      hash: null,
    };
  }

  if (!follow.lastResultHash) {
    await prisma.searchFollow.update({
      where: { id: follow.id },
      data: {
        lastCheckedAt: checkedAt,
        lastResultHash: snapshot.hash,
      },
    });

    return {
      ok: true,
      followId: follow.id,
      status: "baseline_initialized",
      checkedAt,
      hash: snapshot.hash,
    };
  }

  if (follow.lastResultHash !== snapshot.hash) {
    await prisma.searchFollow.update({
      where: { id: follow.id },
      data: {
        lastCheckedAt: checkedAt,
        lastResultHash: snapshot.hash,
        lastNotifiedAt: checkedAt,
      },
    });

    return {
      ok: true,
      followId: follow.id,
      status: "changed",
      checkedAt,
      hash: snapshot.hash,
    };
  }

  await prisma.searchFollow.update({
    where: { id: follow.id },
    data: {
      lastCheckedAt: checkedAt,
    },
  });

  return {
    ok: true,
    followId: follow.id,
    status: "unchanged",
    checkedAt,
    hash: snapshot.hash,
  };
}

export async function checkActiveSearchFollows({ limit }: { limit?: number } = {}) {
  const follows = await prisma.searchFollow.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
    },
    ...(limit && limit > 0 ? { take: limit } : {}),
  });

  const results: SearchFollowCheckResult[] = [];

  for (const follow of follows) {
    results.push(await checkSearchFollow({ followId: follow.id }));
  }

  return {
    total: results.length,
    changed: results.filter((result) => result.ok && result.status === "changed").length,
    unchanged: results.filter((result) => result.ok && result.status === "unchanged").length,
    initialized: results.filter((result) => result.ok && result.status === "baseline_initialized").length,
    unsupported: results.filter(
      (result) =>
        result.ok && (result.status === "unsupported" || result.status === "missing_municipality"),
    ).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

export async function markSearchFollowNotificationSeen({
  userId,
  followId,
}: {
  userId: string;
  followId: string;
}) {
  const result = await prisma.searchFollow.updateMany({
    where: {
      id: followId,
      userId,
      lastNotifiedAt: {
        not: null,
      },
    },
    data: {
      lastNotifiedAt: null,
    },
  });

  return result.count > 0;
}

export async function markMunicipalityFollowUpdatesSeen({
  userId,
  municipalitySlug,
}: {
  userId: string;
  municipalitySlug: string;
}) {
  const municipality = await prisma.municipality.findUnique({
    where: {
      slug: municipalitySlug,
    },
    select: {
      id: true,
    },
  });

  if (!municipality) {
    return false;
  }

  const result = await prisma.searchFollow.updateMany({
    where: {
      userId,
      municipalityId: municipality.id,
      queryText: "municipality-profile",
      isActive: true,
      lastNotifiedAt: {
        not: null,
      },
    },
    data: {
      lastNotifiedAt: null,
    },
  });

  return result.count > 0;
}
