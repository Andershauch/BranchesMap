import assert from "node:assert/strict";
import test from "node:test";

import statbankJobs from "../lib/server/statbank-jobs.ts";

const {
  BRANCH_TABLE,
  DEFAULT_MUNICIPALITY_CODE,
  DEFAULT_TIME_SELECTION,
  REGION_TABLE,
  buildDataFreshnessMessage,
  createJobsRequest,
  isTruthyFlag,
  normalizeMunicipalityCode,
  readJobsRequestFromBody,
  resolveRequestedTimeSelection,
} = statbankJobs;

test("uses the current StatBank table and safe request defaults", () => {
  assert.equal(BRANCH_TABLE, "LSK13");
  assert.equal(REGION_TABLE, "LSK13");
  assert.deepEqual(createJobsRequest({ municipalityCode: "330" }).Variable, {
    Omrade: ["0330"],
    Branche: ["*"],
    Tid: DEFAULT_TIME_SELECTION,
  });
});

test("normalizes municipality codes without accepting arbitrary text", () => {
  assert.equal(normalizeMunicipalityCode("330"), "0330");
  assert.equal(normalizeMunicipalityCode("0101"), "0101");
  assert.equal(normalizeMunicipalityCode("no municipality"), DEFAULT_MUNICIPALITY_CODE);
  assert.equal(normalizeMunicipalityCode(null), DEFAULT_MUNICIPALITY_CODE);
});

test("historical periods are ignored unless explicitly enabled", () => {
  assert.deepEqual(resolveRequestedTimeSelection(["2025K1"], false), DEFAULT_TIME_SELECTION);
  assert.deepEqual(resolveRequestedTimeSelection(["2025K1"], true), ["2025K1"]);
  assert.deepEqual(resolveRequestedTimeSelection([], true), DEFAULT_TIME_SELECTION);
});

test("normalizes POST bodies including Danish area labels", () => {
  assert.deepEqual(
    readJobsRequestFromBody({
      Variable: { Område: ["330"], Branche: ["A", "B"], Tid: ["2025K1"] },
      locale: "en",
      allowHistorical: true,
    }),
    {
      Tabel: "LSK13",
      Variable: { Omrade: ["0330"], Branche: ["A", "B"], Tid: ["2025K1"] },
      Format: "JSONSTAT",
      locale: "en",
      allowHistorical: true,
    },
  );
});

test("accepts only explicit truthy flag values", () => {
  for (const value of ["1", "true", "TRUE", "yes", "YES"]) assert.equal(isTruthyFlag(value), true);
  for (const value of [null, "", "0", "on", " true "]) assert.equal(isTruthyFlag(value), false);
});

test("data freshness copy names the historical override", () => {
  assert.match(buildDataFreshnessMessage("en", "2025K1", true), /Historical override enabled/);
  assert.match(buildDataFreshnessMessage("da", "2025K1", false), /Kun seneste officielle periode/);
});
