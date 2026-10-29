import { describe, expect, it } from "vitest";
import {
  createAdoptionRow,
  MISSING_PROVENANCE_REASON,
  type AdoptionDecision,
} from "./adoption-row.js";

const provenance = {
  engine: "strata",
  model: "model-a",
  fixture: "fixture-a",
  runnerVersion: "1.0.0",
  targetCommit: "0123456789abcdef",
};

describe("createAdoptionRow", () => {
  it.each<AdoptionDecision>(["adopt", "reject", "undetermined"])(
    "preserves %s and every reproduction field when complete",
    (decision) => {
      expect(createAdoptionRow(decision, provenance)).toEqual({
        decision,
        provenance,
      });
    },
  );

  it.each(Object.keys(provenance))(
    "blocks adoption when %s is missing or invalid",
    (field) => {
      for (const value of [undefined, null, "", " \t", 42, false]) {
        const row = createAdoptionRow("adopt", {
          ...provenance,
          [field]: value,
        });
        expect(row.decision).toBe("undetermined");
        expect(row.reason).toBe(MISSING_PROVENANCE_REASON);
        expect(row.provenance).not.toHaveProperty(field);
      }
    },
  );

  it.each([undefined, null, [], "provenance"])(
    "fails closed for malformed provenance %j",
    (input) => {
      expect(createAdoptionRow("adopt", input)).toEqual({
        decision: "undetermined",
        provenance: {},
        reason: MISSING_PROVENANCE_REASON,
      });
    },
  );

  it("takes a snapshot and excludes unrelated or inherited fields", () => {
    const input = { ...provenance, secret: "unrelated" };
    const row = createAdoptionRow("adopt", input);
    input.model = "changed";
    expect(row.provenance).toEqual(provenance);
    expect(createAdoptionRow("adopt", Object.create(provenance)).decision).toBe(
      "undetermined",
    );
  });

  it("rejects unknown decisions at the runtime boundary", () => {
    expect(() =>
      createAdoptionRow("unknown" as AdoptionDecision, provenance),
    ).toThrow("Invalid adoption decision");
  });
});
