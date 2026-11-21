import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { reproductionId } from "./domain/identity";
import { saveReproductionId } from "./store";
import { main } from "../entrypoints/save-local-inference-reproduction-id";

const conditions = {
  engine: "vllm",
  model: "llama-3.1-8b-instruct",
  fixture: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
};

const directories: string[] = [];
const temporary = async (): Promise<string> => {
  const path = await mkdtemp(
    join(tmpdir(), "local-inference-reproduction-id-"),
  );
  directories.push(path);
  return path;
};
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});

describe("saveReproductionId", () => {
  it("atomically saves identical concurrent records without extra input fields", async () => {
    const directory = await temporary();
    const input = { ...conditions, untrustedExtra: "must not be saved" };
    const saved = await Promise.all(
      Array.from({ length: 8 }, () => saveReproductionId(directory, input)),
    );
    expect(new Set(saved.map((s) => s.reproductionId)).size).toBe(1);
    expect(await readdir(directory)).toEqual([
      `${saved[0].reproductionId}.json`,
    ]);

    const record = JSON.parse(await readFile(saved[0].path, "utf8"));
    expect(record).toEqual({
      ...conditions,
      reproductionId: reproductionId(conditions),
    });
  });

  it("saves a different filename for a different configuration", async () => {
    const directory = await temporary();
    const first = await saveReproductionId(directory, conditions);
    const second = await saveReproductionId(directory, {
      ...conditions,
      fixture: "fixture-2026-09-01",
    });
    expect(second.path).not.toBe(first.path);
    expect(await readdir(directory)).toHaveLength(2);
  });

  it("rejects invalid input before creating output", async () => {
    const directory = await temporary();
    await expect(
      saveReproductionId(join(directory, "output"), {
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

    const id = reproductionId(conditions);
    const record = JSON.parse(
      await readFile(join(directory, "output", `${id}.json`), "utf8"),
    );
    expect(record).toEqual({ ...conditions, reproductionId: id });
  });

  it("CLI fails without writing anything on bad arguments", async () => {
    await expect(main([])).rejects.toThrow(/Usage:/);
  });
});
