import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import {
  findRelevantJobindsatsTables,
  getJobindsatsSubjects,
  getJobindsatsTable,
  getJobindsatsTables,
  isJobindsatsConfigured,
} from "@/lib/server/jobindsats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocalDevelopmentRequest(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const hostname = request.nextUrl.hostname;
  const hostHeader = request.headers.get("host")?.toLowerCase() ?? "";

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostHeader.startsWith("localhost:") ||
    hostHeader.startsWith("127.0.0.1:")
  );
}

async function isAuthorized(request: NextRequest) {
  if (isLocalDevelopmentRequest(request)) {
    return true;
  }

  return isAdminAuthenticated();
}

function getSubjectIds(request: NextRequest) {
  return request.nextUrl.searchParams
    .getAll("subjectid")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function getMode(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode")?.trim().toLowerCase() ?? "relevant";

  if (mode === "subjects" || mode === "tables" || mode === "table" || mode === "relevant") {
    return mode;
  }

  return "relevant";
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      {
        ok: false,
        error: "Not authorized to access Jobindsats discovery.",
      },
      { status: 401 },
    );
  }

  if (!isJobindsatsConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "JOBINDSATS_API_TOKEN is not configured.",
      },
      { status: 500 },
    );
  }

  try {
    const mode = getMode(request);

    if (mode === "subjects") {
      return NextResponse.json({
        ok: true,
        mode,
        items: await getJobindsatsSubjects(),
      });
    }

    if (mode === "tables") {
      return NextResponse.json({
        ok: true,
        mode,
        items: await getJobindsatsTables(getSubjectIds(request)),
      });
    }

    if (mode === "table") {
      const tableId = request.nextUrl.searchParams.get("tableId")?.trim();

      if (!tableId) {
        return NextResponse.json(
          {
            ok: false,
            error: "tableId is required when mode=table.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        ok: true,
        mode,
        item: await getJobindsatsTable(tableId),
      });
    }

    const rawLimit = request.nextUrl.searchParams.get("limit");
    const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 25;

    return NextResponse.json({
      ok: true,
      mode,
      items: await findRelevantJobindsatsTables({ limit }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Jobindsats discovery error.",
      },
      { status: 502 },
    );
  }
}
