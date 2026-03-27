import { NextRequest, NextResponse } from "next/server";

import {
  BRANCH_TABLE,
  createJobsRequest,
  getMunicipalityLiveJobEstimate,
  isTruthyFlag,
  normalizeMunicipalityCode,
  readJobsRequestFromBody,
  resolveRequestedTimeSelection,
  type JobsRouteRequest,
} from "@/lib/server/statbank-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readJobsRequestFromSearchParams(request: NextRequest): JobsRouteRequest {
  const { searchParams } = request.nextUrl;
  const allowHistorical = isTruthyFlag(searchParams.get("allowHistorical"));

  return createJobsRequest({
    municipalityCode: normalizeMunicipalityCode(searchParams.get("municipalityCode")),
    table: searchParams.get("table")?.trim() || BRANCH_TABLE,
    branchValues: searchParams.getAll("branche"),
    timeValues: resolveRequestedTimeSelection(searchParams.getAll("tid"), allowHistorical),
    locale: searchParams.get("locale") === "en" ? "en" : "da",
    allowHistorical,
  });
}

function buildErrorResponse(error: unknown) {
  console.error("Failed to fetch job data from Danmarks Statistik.", error);

  const details = error instanceof Error ? error.message : "Ukendt fejl.";
  const status = details.startsWith("Unknown municipality code") || details.startsWith("Could not map municipality") ? 400 : 503;

  return NextResponse.json(
    {
      ok: false,
      error: "Danmarks Statistik API er midlertidigt utilgaengelig eller returnerede uventede data.",
      details,
    },
    { status },
  );
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getMunicipalityLiveJobEstimate(readJobsRequestFromSearchParams(request)));
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Parameters<typeof readJobsRequestFromBody>[0];
    return NextResponse.json(await getMunicipalityLiveJobEstimate(readJobsRequestFromBody(body)));
  } catch (error) {
    return buildErrorResponse(error);
  }
}