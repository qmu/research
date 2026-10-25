import { createHash } from "node:crypto";

/** Immutable experiment conditions, distinct from a unique execution/run ID. */
export interface ReproductionConditions {
  engine: string;
  model: string;
  fixture: string;
  runnerVersion: string;
  /** Full Git object ID; branch names and abbreviated SHAs are not immutable. */
  targetCommit: string;
}

export interface ReproductionRecord extends ReproductionConditions {
  reproductionId: string;
}

/** Versioned, ordered JSON prevents property-order and delimiter collisions. */
export function createReproductionRecord(
  conditions: ReproductionConditions,
): ReproductionRecord {
  const fields = [
    "engine",
    "model",
    "fixture",
    "runnerVersion",
    "targetCommit",
  ] as const;
  for (const field of fields) {
    const value = conditions[field];
    if (
      typeof value !== "string" ||
      value.trim().length === 0 ||
      value !== value.trim()
    ) {
      throw new Error(`Invalid reproduction condition: ${field}`);
    }
  }
  if (!/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(conditions.targetCommit)) {
    throw new Error("targetCommit must be a full Git object ID");
  }
  const record = Object.fromEntries(
    fields.map((field) => [
      field,
      field === "targetCommit"
        ? conditions[field].toLowerCase()
        : conditions[field],
    ]),
  ) as unknown as ReproductionConditions;
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        "research-reproduction-v1",
        ...fields.map((f) => record[f]),
      ]),
    )
    .digest("hex");
  return { ...record, reproductionId: `repro-v1-${digest}` };
}
