import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

import { getMunicipalityHomeMapConfig } from "../lib/config/home-map-display";
import { pocMunicipalities } from "../lib/mock/poc-data";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL mangler i milj\u00f8et.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.job.deleteMany({ where: { isMock: true } });
  await prisma.municipalityIndustryStat.deleteMany({ where: { isMock: true } });

  let industryCount = 0;
  let statCount = 0;
  let jobCount = 0;

  for (const municipality of pocMunicipalities) {
    const homeMap = getMunicipalityHomeMapConfig(municipality.slug);
    const municipalityRecord = await prisma.municipality.upsert({
      where: { slug: municipality.slug },
      update: {
        code: municipality.code,
        name: municipality.name,
        teaser: municipality.teaser,
        homeMapVisible: homeMap.isPrimary,
        homeMapAttractMode: homeMap.useInAttractMode,
        homeMapPriority: homeMap.priority,
        homeMapLabelMode: homeMap.labelMode,
        homeMapRegionTag: homeMap.regionTag,
      },
      create: {
        code: municipality.code,
        name: municipality.name,
        slug: municipality.slug,
        teaser: municipality.teaser,
        homeMapVisible: homeMap.isPrimary,
        homeMapAttractMode: homeMap.useInAttractMode,
        homeMapPriority: homeMap.priority,
        homeMapLabelMode: homeMap.labelMode,
        homeMapRegionTag: homeMap.regionTag,
      },
    });

    for (const entry of municipality.jobsByIndustry) {
      const industryRecord = await prisma.industry.upsert({
        where: { slug: entry.industry.slug },
        update: {
          code: entry.industry.code,
          nameDa: entry.industry.name,
          icon: entry.industry.icon,
          accentColor: entry.industry.accentColor,
        },
        create: {
          code: entry.industry.code,
          slug: entry.industry.slug,
          nameDa: entry.industry.name,
          icon: entry.industry.icon,
          accentColor: entry.industry.accentColor,
        },
      });
      industryCount += 1;

      await prisma.municipalityIndustryStat.create({
        data: {
          municipalityId: municipalityRecord.id,
          industryId: industryRecord.id,
          rank:
            municipality.topIndustries.findIndex(({ slug }) => slug === entry.industry.slug) + 1,
          jobCount: entry.industry.jobCount,
          isMock: true,
        },
      });
      statCount += 1;

      for (const job of entry.jobs) {
        await prisma.job.create({
          data: {
            id: job.id,
            title: job.title.da,
            employerName: job.employerName.da,
            locationLabel: job.locationLabel.da,
            summary: job.summary.da,
            applyUrl: job.applyUrl,
            language: "da",
            municipalityId: municipalityRecord.id,
            industryId: industryRecord.id,
            isMock: true,
          },
        });
        jobCount += 1;
      }
    }
  }

  console.log(
    `Seed fuldf\u00f8rt: ${pocMunicipalities.length} kommuner, ${industryCount} branche-relationer, ${statCount} statistik-r\u00e6kker og ${jobCount} jobs behandlet.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
