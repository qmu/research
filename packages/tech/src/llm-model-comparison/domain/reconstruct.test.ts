import { describe, expect, it } from "vitest";
import {
  archivesOldestFirst,
  isImplausibleNarrowing,
  mayWriteWholeRecord,
  reconstructRecord,
} from "./history";
import type { ConfigRun } from "./types";

/**
 * The record that renders the published comparison tables lived only in a
 * gitignored, machine-local `.real.data.json`. A scoped sweep in a fresh
 * worktree therefore found no previous record, skipped the merge entirely, and
 * its 12 measured configs became the WHOLE record — which would have cut the
 * published speed and accuracy tables from 47 rows to 12. It was caught by
 * inspection, not by any check.
 *
 * These cover the two pure pieces of the fix: rebuilding the complete record
 * from the committed frames, and refusing an implausible narrowing at the
 * projection step.
 */

const run = (
  id: string,
  effort: string,
  provenance: ConfigRun["provenance"] = "measured",
): ConfigRun =>
  ({
    id,
    effort,
    provenance,
    trials: [],
    measuredAt: "2026-07-20T00:00:00.000Z",
  }) as unknown as ConfigRun;

describe("archivesOldestFirst", () => {
  it("orders ISO-stamped archives chronologically", () => {
    expect(
      archivesOldestFirst([
        "2026-07-20T07-00-41.413Z.data.json.gz",
        "2026-07-06T13-08-50.282Z.data.json.gz",
        "2026-07-12T05-47-26.268Z.data.json.gz",
      ]),
    ).toEqual([
      "2026-07-06T13-08-50.282Z.data.json.gz",
      "2026-07-12T05-47-26.268Z.data.json.gz",
      "2026-07-20T07-00-41.413Z.data.json.gz",
    ]);
  });
});

describe("reconstructRecord (the record is rebuildable from committed frames)", () => {
  it("returns null when there are no frames", () => {
    expect(reconstructRecord([])).toBeNull();
  });

  it("carries forward configs a later scoped frame did not touch", () => {
    // This is the exact shape of the incident: a wide frame followed by a
    // narrow scoped one. Rendering the NEWEST frame alone yields 1 config;
    // folding yields all 3.
    const wide = {
      generatedAt: "2026-07-12T05:47:26.268Z",
      configs: [run("a", "low"), run("b", "low"), run("c", "low")],
    };
    const narrow = {
      generatedAt: "2026-07-20T07:00:41.413Z",
      configs: [run("b", "low")],
    };
    const rebuilt = reconstructRecord([wide, narrow]);
    expect(rebuilt?.configs.map((c) => c.id).sort()).toEqual(["a", "b", "c"]);
    expect(narrow.configs).toHaveLength(1);
  });

  it("takes the newest frame's metadata but the folded config set", () => {
    const rebuilt = reconstructRecord([
      { generatedAt: "2026-07-12T05:47:26.268Z", configs: [run("a", "low")] },
      { generatedAt: "2026-07-20T07:00:41.413Z", configs: [run("b", "low")] },
    ]);
    expect(rebuilt?.generatedAt).toBe("2026-07-20T07:00:41.413Z");
    expect(rebuilt?.configs).toHaveLength(2);
  });

  it("never lets a later error frame downgrade a real measurement", () => {
    // The fold reuses mergeConfigs, so the downgrade guard applies to
    // reconstruction exactly as it does to an incremental run.
    const rebuilt = reconstructRecord([
      { generatedAt: "2026-07-12T00:00:00.000Z", configs: [run("a", "low")] },
      {
        generatedAt: "2026-07-20T00:00:00.000Z",
        configs: [run("a", "low", "error")],
      },
    ]);
    expect(rebuilt?.configs).toHaveLength(1);
    expect(rebuilt?.configs[0]?.provenance).toBe("measured");
  });

  it("appends a configuration that only a newer frame introduces", () => {
    const rebuilt = reconstructRecord([
      { generatedAt: "2026-07-12T00:00:00.000Z", configs: [run("a", "low")] },
      {
        generatedAt: "2026-07-20T00:00:00.000Z",
        configs: [run("a", "low"), run("z", "high")],
      },
    ]);
    expect(rebuilt?.configs.map((c) => c.id)).toEqual(["a", "z"]);
  });
});

describe("isImplausibleNarrowing (the projection refuses to shrink a page)", () => {
  it("refuses the incident's shape", () => {
    expect(isImplausibleNarrowing(47, 12)).toBe(true);
  });

  it("allows an unchanged census", () => {
    expect(isImplausibleNarrowing(47, 47)).toBe(false);
  });

  it("allows growth", () => {
    expect(isImplausibleNarrowing(47, 48)).toBe(false);
  });

  it("refuses even a single lost row", () => {
    expect(isImplausibleNarrowing(47, 46)).toBe(true);
  });
});

describe("mayWriteWholeRecord (a scoped run must not become the census)", () => {
  const verdict = (
    selectorPresent: boolean,
    hasBase: boolean,
    allowPartialRecord = false,
  ): boolean =>
    mayWriteWholeRecord({ selectorPresent, hasBase, allowPartialRecord });

  it("refuses a scoped run with no base — the defect", () => {
    expect(verdict(true, false)).toBe(false);
  });

  it("allows a scoped run that has a base to merge", () => {
    expect(verdict(true, true)).toBe(true);
  });

  it("still allows a first FULL run with no record to replace it", () => {
    expect(verdict(false, false)).toBe(true);
  });

  it("allows a full run regardless of base", () => {
    expect(verdict(false, true)).toBe(true);
  });

  it("lets --allow-partial-record override, explicitly", () => {
    expect(verdict(true, false, true)).toBe(true);
  });
});
