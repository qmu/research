/** Provenance required to reproduce an adoption decision. */
export interface AdoptionProvenance {
  engine: string;
  model: string;
  fixture: string;
  runnerVersion: string;
  targetCommit: string;
}

export type AdoptionDecision = "adopt" | "reject" | "undetermined";

export const MISSING_PROVENANCE_REASON = "missing-required-provenance";

export interface AdoptionRow {
  decision: AdoptionDecision;
  provenance: Partial<AdoptionProvenance>;
  reason?: typeof MISSING_PROVENANCE_REASON;
}

const provenanceFields = [
  "engine",
  "model",
  "fixture",
  "runnerVersion",
  "targetCommit",
] as const;

/** Missing, blank, or malformed provenance can never produce an adopt row. */
export function createAdoptionRow(
  decision: AdoptionDecision,
  input: unknown,
): AdoptionRow {
  if (!["adopt", "reject", "undetermined"].includes(decision)) {
    throw new Error("Invalid adoption decision");
  }
  const provenance: Partial<AdoptionProvenance> = {};
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    for (const field of provenanceFields) {
      const value = Object.prototype.hasOwnProperty.call(input, field)
        ? (input as Record<string, unknown>)[field]
        : undefined;
      if (typeof value === "string" && value.trim().length > 0) {
        provenance[field] = value;
      }
    }
  }
  if (provenanceFields.some((field) => provenance[field] === undefined)) {
    return {
      decision: "undetermined",
      provenance,
      reason: MISSING_PROVENANCE_REASON,
    };
  }
  return { decision, provenance };
}
