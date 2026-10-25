// One row of a saved local-inference comparison: the five conditions that
// determine its reproduction id, plus its adoption verdict and (when
// rejected) the fixed reason. Only these allowlisted fields are ever read
// from an input file.

import { reproductionId, type ReproductionConditions } from "./identity";

export type AdoptionVerdict = "adopted" | "rejected";

export type AdoptionRow = ReproductionConditions &
  Readonly<{
    verdict: AdoptionVerdict;
    reasonCode?: string;
    reproductionId: string;
  }>;

export type AdoptionRowFile = Readonly<{
  schemaVersion: 1;
  rows: ReadonlyArray<
    ReproductionConditions & { verdict: AdoptionVerdict; reasonCode?: string }
  >;
}>;

const CONDITION_FIELDS = [
  "engine",
  "model",
  "fixture",
  "runnerVersion",
  "targetCommit",
] as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseRow = (raw: unknown, index: number): AdoptionRow => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`rows[${index}] must be an object`);
  }
  const record = raw as Record<string, unknown>;

  for (const field of CONDITION_FIELDS) {
    if (!isNonEmptyString(record[field])) {
      throw new Error(`rows[${index}].${field} must be a nonempty string`);
    }
  }

  if (record.verdict !== "adopted" && record.verdict !== "rejected") {
    throw new Error(`rows[${index}].verdict must be "adopted" or "rejected"`);
  }

  if (record.reasonCode !== undefined && !isNonEmptyString(record.reasonCode)) {
    throw new Error(
      `rows[${index}].reasonCode must be a nonempty string when present`,
    );
  }

  if (record.verdict === "rejected" && record.reasonCode === undefined) {
    throw new Error(`rows[${index}] is "rejected" but carries no reasonCode`);
  }

  const conditions: ReproductionConditions = {
    engine: record.engine as string,
    model: record.model as string,
    fixture: record.fixture as string,
    runnerVersion: record.runnerVersion as string,
    targetCommit: record.targetCommit as string,
  };

  return {
    ...conditions,
    verdict: record.verdict,
    reproductionId: reproductionId(conditions),
    ...(record.reasonCode === undefined
      ? {}
      : { reasonCode: record.reasonCode as string }),
  };
};

/**
 * Parses and strictly validates a saved local-inference adoption row file,
 * attaching each row's stable reproductionId. Extra keys an input file
 * happens to carry are never read.
 */
export const parseAdoptionRowFile = (
  raw: unknown,
): ReadonlyArray<AdoptionRow> => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("adoption row file must be an object");
  }
  const record = raw as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    throw new Error(
      `unsupported schemaVersion: ${JSON.stringify(record.schemaVersion)}`,
    );
  }
  if (!Array.isArray(record.rows)) {
    throw new Error("adoption row file must have a rows array");
  }

  const rows = record.rows.map((entry, index) => parseRow(entry, index));

  const seenIds = new Set<string>();
  for (const row of rows) {
    if (seenIds.has(row.reproductionId)) {
      throw new Error(`duplicate reproduction id: ${row.reproductionId}`);
    }
    seenIds.add(row.reproductionId);
  }

  return rows;
};
