import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MISSING_PROVENANCE_REASON,
  type AdoptionDecision,
} from "../../strata-adoption/domain/adoption-row.js";
import { loadAdoptionRow, saveAdoptionRow } from "./json-file.js";

const provenance = {
  engine: "strata",
  model: "model-a",
  fixture: "fixture-a",
  runnerVersion: "1.0.0",
  targetCommit: "0123456789abcdef",
};

let directory: string;
let path: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "strata-adoption-"));
  path = join(directory, "adoption.json");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("adoption row JSON persistence", () => {
  it.each<AdoptionDecision>(["adopt", "reject", "undetermined"])(
    "roundtrips %s with all five provenance fields",
    async (decision) => {
      const row = await saveAdoptionRow(path, decision, provenance);
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
        decision,
        provenance,
      });
      expect(await loadAdoptionRow(path)).toEqual(row);
    },
  );

  it("saves incomplete provenance as undetermined and preserves that on load", async () => {
    const { targetCommit: _missing, ...incomplete } = provenance;
    const expected = {
      decision: "undetermined",
      provenance: incomplete,
      reason: MISSING_PROVENANCE_REASON,
    };
    expect(await saveAdoptionRow(path, "adopt", incomplete)).toEqual(expected);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(expected);
    expect(await loadAdoptionRow(path)).toEqual(expected);
  });

  it("revalidates incomplete stored rows instead of trusting an adopt decision", async () => {
    await writeFile(
      path,
      JSON.stringify({ decision: "adopt", provenance: { engine: "strata" } }),
    );
    expect(await loadAdoptionRow(path)).toEqual({
      decision: "undetermined",
      provenance: { engine: "strata" },
      reason: MISSING_PROVENANCE_REASON,
    });
  });

  it("refuses to overwrite an existing artifact", async () => {
    await saveAdoptionRow(path, "reject", provenance);
    const before = await readFile(path, "utf8");
    await expect(
      saveAdoptionRow(path, "adopt", provenance),
    ).rejects.toMatchObject({
      code: "EEXIST",
    });
    expect(await readFile(path, "utf8")).toBe(before);
  });

  it.each(["null", "[]", "42", '"adopt"', "{", "{}", '{"decision":"unknown"}'])(
    "rejects invalid stored JSON %s",
    async (content) => {
      await writeFile(path, content);
      await expect(loadAdoptionRow(path)).rejects.toThrow();
    },
  );

  it("propagates storage errors instead of claiming a saved or loaded row", async () => {
    await expect(loadAdoptionRow(path)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      saveAdoptionRow(
        join(directory, "absent", "row.json"),
        "adopt",
        provenance,
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
