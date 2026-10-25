import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createReproductionRecord } from "./domain/reproduction.js";
import { saveReproductionRecord } from "./reproduction-store.js";

const conditions = {
  engine: "ollama",
  model: "qwen3:8b",
  fixture: "local-inference-v1",
  runnerVersion: "runner-v1",
  targetCommit: "a".repeat(40),
};
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.map((d) => rm(d, { recursive: true, force: true })),
  );
  directories.length = 0;
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), "reproduction-"));
  directories.push(path);
  return path;
}

describe("reproduction identity", () => {
  it("pins the v1 hash and ignores object order and extra metadata", () => {
    const record = createReproductionRecord(conditions);
    expect(record.reproductionId).toBe(
      "repro-v1-7da42bec51174f6dfd7ffcd0ee05d61c226919afa20b631edd7a8f21bfd3b408",
    );
    expect(
      createReproductionRecord({
        targetCommit: conditions.targetCommit.toUpperCase(),
        runnerVersion: conditions.runnerVersion,
        fixture: conditions.fixture,
        model: conditions.model,
        engine: conditions.engine,
        ...{ executionId: "another-run", secret: "not-persisted" },
      }),
    ).toEqual(record);
  });
  it.each([
    "engine",
    "model",
    "fixture",
    "runnerVersion",
    "targetCommit",
  ] as const)("changes when %s changes", (field) => {
    const changed = {
      ...conditions,
      [field]:
        field === "targetCommit" ? "b".repeat(40) : conditions[field] + "-2",
    };
    expect(createReproductionRecord(changed).reproductionId).not.toBe(
      createReproductionRecord(conditions).reproductionId,
    );
  });
  it("does not collide when delimiters move between fields", () => {
    expect(
      createReproductionRecord({ ...conditions, engine: "a|b", model: "c" })
        .reproductionId,
    ).not.toBe(
      createReproductionRecord({ ...conditions, engine: "a", model: "b|c" })
        .reproductionId,
    );
  });
  it.each(["", " ", " main", "main", "abc123"])(
    "rejects invalid commits: %j",
    (targetCommit) => {
      expect(() =>
        createReproductionRecord({ ...conditions, targetCommit }),
      ).toThrow();
    },
  );
  it.each(["engine", "model", "fixture", "runnerVersion"] as const)(
    "rejects missing %s",
    (field) => {
      expect(() =>
        createReproductionRecord({ ...conditions, [field]: "" }),
      ).toThrow();
    },
  );
  it("saves and rereads the same ID without overwriting on repeat", async () => {
    const dir = await directory();
    const first = await saveReproductionRecord(dir, {
      ...conditions,
      ...{ secret: "not-persisted" },
    });
    expect(await saveReproductionRecord(dir, conditions)).toEqual(first);
    expect(await readdir(dir)).toEqual([`${first.reproductionId}.json`]);
    expect(
      JSON.parse(
        await readFile(join(dir, `${first.reproductionId}.json`), "utf8"),
      ),
    ).toEqual(first);
  });
  it("refuses to overwrite a corrupt existing record", async () => {
    const dir = await directory();
    const record = await saveReproductionRecord(dir, conditions);
    const path = join(dir, `${record.reproductionId}.json`);
    await writeFile(path, "{}");
    await expect(saveReproductionRecord(dir, conditions)).rejects.toThrow(
      "does not match",
    );
    expect(await readFile(path, "utf8")).toBe("{}");
  });
  it("rejects invalid conditions before creating a directory", async () => {
    const dir = await directory();
    await expect(
      saveReproductionRecord(join(dir, "unused"), { ...conditions, model: "" }),
    ).rejects.toThrow();
    expect(await readdir(dir)).toEqual([]);
  });
});
