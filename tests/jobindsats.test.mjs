import assert from "node:assert/strict";
import test from "node:test";

import jobindsatsImports from "../lib/server/jobindsats-imports.ts";
import jobindsats from "../lib/server/jobindsats.ts";
import jobindsatsCategory from "../lib/server/jobindsats-category-mapping.ts";

const {
  compareJobindsatsPeriods,
  getLatestMonthlyJobindsatsPeriod,
  normalizeJobindsatsText,
} = jobindsatsImports;
const { getJobindsatsSubjects, getJobindsatsTable, normalizeJobindsatsTableId } = jobindsats;
const {
  classifyJobindsatsTitle,
  isGenericJobindsatsRepresentativeTitle,
  mapJobindsatsTitleToIndustryCode,
} = jobindsatsCategory;

test("selects the latest valid monthly period and excludes invalid months", () => {
  assert.equal(getLatestMonthlyJobindsatsPeriod(["2025M01", "2025M12", "2025M13", "2025M00", "quarterly"]), "2025M12");
  assert.equal(getLatestMonthlyJobindsatsPeriod(["2025K1", "bad"]), null);
  assert.equal(compareJobindsatsPeriods("2025M02", "2025M11") < 0, true);
});

test("normalizes imported Danish text and table identifiers", () => {
  assert.equal(normalizeJobindsatsText("  Sygeplejerske\t ved Sygehus  "), "Sygeplejerske ved Sygehus");
  assert.equal(normalizeJobindsatsTableId(" Y25I07 "), "y25i07");
  assert.throws(() => normalizeJobindsatsTableId("../Y25I07"), /Invalid Jobindsats table id/);
});

test("calls the Jobindsats v3 API with bearer auth and encoded route parameters", async (t) => {
  const previousToken = process.env.JOBINDSATS_API_TOKEN;
  const previousFetch = globalThis.fetch;
  let capturedUrl;
  let capturedInit;

  t.after(() => {
    if (previousToken === undefined) delete process.env.JOBINDSATS_API_TOKEN;
    else process.env.JOBINDSATS_API_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  });

  process.env.JOBINDSATS_API_TOKEN = "test-token";
  globalThis.fetch = async (url, init) => {
    capturedUrl = new URL(url);
    capturedInit = init;
    return Response.json({ table_id: "y25i07" });
  };

  const table = await getJobindsatsTable(" Y25I07 ");
  assert.equal(table.table_id, "y25i07");
  assert.equal(capturedUrl.pathname, "/v3/table/y25i07");
  assert.equal(capturedUrl.searchParams.get("format"), "json");
  assert.equal(capturedInit.headers.Authorization, "Bearer test-token");
  assert.equal(capturedInit.cache, "no-store");
});

test("does not include an upstream response body in API errors", async (t) => {
  const previousToken = process.env.JOBINDSATS_API_TOKEN;
  const previousFetch = globalThis.fetch;

  t.after(() => {
    if (previousToken === undefined) delete process.env.JOBINDSATS_API_TOKEN;
    else process.env.JOBINDSATS_API_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  });

  process.env.JOBINDSATS_API_TOKEN = "test-token";
  globalThis.fetch = async () => new Response("upstream secret payload", { status: 401, statusText: "Unauthorized" });

  await assert.rejects(getJobindsatsSubjects(), (error) => {
    assert.match(error.message, /401 Unauthorized/);
    assert.doesNotMatch(error.message, /upstream secret payload/);
    return true;
  });
});

test("classifies representative titles and flags generic categories", () => {
  assert.equal(mapJobindsatsTitleToIndustryCode("Sygeplejerske"), "health");
  assert.equal(classifyJobindsatsTitle("Sygeplejerske").industryCode, "health");
  assert.equal(isGenericJobindsatsRepresentativeTitle("Akademisk arbejde"), true);
  assert.equal(isGenericJobindsatsRepresentativeTitle("Elektriker"), false);
});
