import { createHash } from "node:crypto";

export interface ReproductionConditions {
  engine: string;
  model: string;
  fixture: string;
  runnerVersion: string;
  targetCommit: string;
}

/** Fixed field order, no timestamps, no dependence on the caller's key order. */
export const reproductionIdentity = (
  input: ReproductionConditions,
): ReproductionConditions & { runId: string } => {
  const keys = [
    "engine",
    "model",
    "fixture",
    "runnerVersion",
    "targetCommit",
  ] as const;
  for (const key of keys) {
    if (typeof input[key] !== "string" || input[key].trim().length === 0) {
      throw new Error(`Invalid reproduction condition: ${key}`);
    }
  }
  // Require a full commit SHA: abbreviated refs and branch names can drift.
  if (!/^[a-fA-F0-9]{40}$/.test(input.targetCommit)) {
    throw new Error("Invalid reproduction condition: targetCommit");
  }
  const conditions: ReproductionConditions = {
    engine: input.engine,
    model: input.model,
    fixture: input.fixture,
    runnerVersion: input.runnerVersion,
    targetCommit: input.targetCommit.toLowerCase(),
  };
  const digest = createHash("sha256")
    .update(JSON.stringify(["reproduction-v1", ...Object.values(conditions)]))
    .digest("hex");
  return { ...conditions, runId: `repro-v1-${digest}` };
};
