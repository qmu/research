import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { reproductionIdentity } from "./domain/identity";
import { saveReproductionRun } from "./store";
import { main } from "../entrypoints/save-reproduction-run";

const conditions = {
  engine: "ollama",
  model: "model@digest",
  fixture: "fixture-v1",
  runnerVersion: "runner-v1",
  targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
};
const directories: string[] = [];
const temporary = async (): Promise<string> => {
  const path = await mkdtemp(join(tmpdir(), "reproduction-test-"));
  directories.push(path);
  return path;
};
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});

describe("reproduction run identity", () => {
  it("pins the v1 identity format", () => {
    expect(reproductionIdentity(conditions).runId).toBe(
      "repro-v1-fc35cb768e567f013071cbe59624f78f9819f464c8504465eaeadc4bbcb94c93",
    );
  });

  it("is stable across property order and full SHA letter case", () => {
    expect(
      reproductionIdentity({
        targetCommit: conditions.targetCommit.toUpperCase(),
        runnerVersion: conditions.runnerVersion,
        fixture: conditions.fixture,
        model: conditions.model,
        engine: conditions.engine,
      }),
    ).toEqual(reproductionIdentity(conditions));
    expect(reproductionIdentity(conditions).runId).toMatch(
      /^repro-v1-[a-f0-9]{64}$/,
    );
  });

  it.each(Object.keys(conditions) as (keyof typeof conditions)[])(
    "changes when %s changes",
    (key) => {
      const value =
        key === "targetCommit" ? "f".repeat(40) : `${conditions[key]}2`;
      expect(
        reproductionIdentity({ ...conditions, [key]: value }).runId,
      ).not.toBe(reproductionIdentity(conditions).runId);
    },
  );

  it("does not confuse delimiter-containing fields", () => {
    expect(
      reproductionIdentity({ ...conditions, engine: "a|b", model: "c" }).runId,
    ).not.toBe(
      reproductionIdentity({ ...conditions, engine: "a", model: "b|c" }).runId,
    );
  });

  it.each(["", " ", "main", "abcdef0", "g".repeat(40)])(
    "rejects invalid commits: %s",
    (targetCommit) => {
      expect(() =>
        reproductionIdentity({ ...conditions, targetCommit }),
      ).toThrow();
    },
  );

  it.each(Object.keys(conditions) as (keyof typeof conditions)[])(
    "rejects missing or blank %s",
    (key) => {
      for (const value of [undefined, null, false, "", "  "]) {
        expect(() =>
          reproductionIdentity({
            ...conditions,
            [key]: value,
          } as unknown as typeof conditions),
        ).toThrow();
      }
    },
  );
});

describe("reproduction run persistence", () => {
  it("atomically saves identical concurrent records without extra input fields", async () => {
    const directory = await temporary();
    const input = { ...conditions, untrustedExtra: "must not be saved" };
    const records = await Promise.all(
      Array.from({ length: 8 }, () => saveReproductionRun(directory, input)),
    );
    expect(new Set(records.map((r) => r.runId)).size).toBe(1);
    expect(await readdir(directory)).toEqual([`${records[0].runId}.json`]);
    expect(JSON.parse(await readFile(records[0].path, "utf8"))).toEqual(
      reproductionIdentity(conditions),
    );
    const different = await saveReproductionRun(directory, {
      ...conditions,
      fixture: "fixture-v2",
    });
    expect(different.path).not.toBe(records[0].path);
    expect(await readdir(directory)).toHaveLength(2);
  });

  it("rejects invalid input before creating output", async () => {
    const directory = await temporary();
    await expect(
      saveReproductionRun(join(directory, "output"), {
        ...conditions,
        engine: "",
      }),
    ).rejects.toThrow();
    expect(await readdir(directory)).toEqual([]);
  });

  it("saves CLI conditions through the same identity API", async () => {
    const directory = await temporary();
    const input = join(directory, "input.json");
    await writeFile(input, JSON.stringify(conditions));
    await main([input, join(directory, "output")]);
    const record = reproductionIdentity(conditions);
    expect(
      JSON.parse(
        await readFile(
          join(directory, "output", `${record.runId}.json`),
          "utf8",
        ),
      ),
    ).toEqual(record);
  });
});
