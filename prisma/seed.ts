import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

import { pocMunicipalities } from "../lib/mock/poc-data";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL mangler i miljøet.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  let industryCount = 0;
  let statCount = 0;
  let jobCount = 0;

  for (const municipality of pocMunicipalities) {
    const municipalityRecord = await prisma.municipality.upsert({
      where: { slug: municipality.slug },
      update: {
        code: municipality.code,
        name: municipality.name,
        mapX: municipality.mapX,
        mapY: municipality.mapY,
        teaser: municipality.teaser,
      },
      create: {
        code: municipality.code,
        name: municipality.name,
        slug: municipality.slug,
        mapX: municipality.mapX,
        mapY: municipality.mapY,
        teaser: municipality.teaser,
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

      await prisma.municipalityIndustryStat.upsert({
        where: {
          municipalityId_industryId: {
            municipalityId: municipalityRecord.id,
            industryId: industryRecord.id,
          },
        },
        update: {
          rank:
            municipality.topIndustries.findIndex(
              ({ slug }) => slug === entry.industry.slug,
            ) + 1,
          jobCount: entry.industry.jobCount,
          isMock: true,
        },
        create: {
          municipalityId: municipalityRecord.id,
          industryId: industryRecord.id,
          rank:
            municipality.topIndustries.findIndex(
              ({ slug }) => slug === entry.industry.slug,
            ) + 1,
          jobCount: entry.industry.jobCount,
          isMock: true,
        },
      });
      statCount += 1;

      for (const job of entry.jobs) {
        await prisma.job.upsert({
          where: { id: job.id },
          update: {
            title: job.title,
            employerName: job.employerName,
            locationLabel: job.locationLabel,
            summary: job.summary,
            applyUrl: job.applyUrl,
            language: job.language,
            municipalityId: municipalityRecord.id,
            industryId: industryRecord.id,
            isMock: true,
          },
          create: {
            id: job.id,
            title: job.title,
            employerName: job.employerName,
            locationLabel: job.locationLabel,
            summary: job.summary,
            applyUrl: job.applyUrl,
            language: job.language,
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
    `Seed fuldført: ${pocMunicipalities.length} kommuner, ${industryCount} branche-relationer, ${statCount} statistik-rækker og ${jobCount} jobs behandlet.`,
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