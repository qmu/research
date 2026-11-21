// A stable identifier for one local-inference comparison configuration,
// derived only from the five conditions that fully determine it: engine,
// model, fixture, runnerVersion, and targetCommit. No timestamp, host,
// measured result, or credential ever enters the id.

import { createHash } from "node:crypto";

export type ReproductionConditions = Readonly<{
  engine: string;
  model: string;
  fixture: string;
  runnerVersion: string;
  targetCommit: string;
}>;

const CONDITION_KEYS = [
  "engine",
  "model",
  "fixture",
  "runnerVersion",
  "targetCommit",
] as const;

const FULL_GIT_SHA = /^[a-fA-F0-9]{40}$/;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Validates the five conditions and normalizes targetCommit to lowercase.
 * Every other field is kept byte-for-byte: callers must pass immutable
 * identifiers for model/fixture when their contents can change over time.
 */
export const normalizeReproductionConditions = (
  input: ReproductionConditions,
): ReproductionConditions => {
  for (const key of CONDITION_KEYS) {
    if (!isNonEmptyString(input[key])) {
      throw new Error(
        `reproduction condition "${key}" must be a nonempty string`,
      );
    }
  }
  if (!FULL_GIT_SHA.test(input.targetCommit)) {
    throw new Error(
      'reproduction condition "targetCommit" must be a full 40-character git SHA',
    );
  }
  return {
    engine: input.engine,
    model: input.model,
    fixture: input.fixture,
    runnerVersion: input.runnerVersion,
    targetCommit: input.targetCommit.toLowerCase(),
  };
};

/**
 * A stable id for one reproduction configuration: independent of the
 * caller's property order and of targetCommit letter case. Two calls with
 * the same five conditions always return the same id, and changing any one
 * of the five conditions always changes it.
 */
export const reproductionId = (input: ReproductionConditions): string => {
  const conditions = normalizeReproductionConditions(input);
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        "local-inference-reproduction-id-v1",
        ...CONDITION_KEYS.map((key) => conditions[key]),
      ]),
    )
    .digest("hex");
  return `lirid-v1-${digest}`;
};
