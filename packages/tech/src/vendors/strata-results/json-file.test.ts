import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { loadStrataResult, saveStrataResult } from "./json-file.js";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function path() {
  const dir = await mkdtemp(join(tmpdir(), "strata-result-"));
  dirs.push(dir);
  return join(dir, "result.json");
}
function execution() {
  return {
    model: "fixture",
    fixedTier: { id: "16GiB", capacityMiB: 16384 },
    speed: { value: 20, unit: "tokens/s", tierId: "16GiB" },
    quality: { value: 0.8, unit: "fraction", tierId: "16GiB" },
    peakMemory: { value: 12288, unit: "MiB", tierId: "16GiB" },
    adoption: "adopt",
  };
}

it("persists all three axes and returns the same normalized result on load", async () => {
  const file = await path();
  const saved = await saveStrataResult(file, {
    ...execution(),
    stdout: "not retained",
  });
  expect(await loadStrataResult(file)).toEqual(saved);
  const text = await readFile(file, "utf8");
  expect(text).toContain("memoryHeadroom");
  expect(text).not.toContain("not retained");
});

it("persists unknown readings without making them adoption candidates", async () => {
  const file = await path();
  await saveStrataResult(file, { ...execution(), peakMemory: undefined });
  expect(await loadStrataResult(file)).toMatchObject({
    adoption: "undetermined",
    memoryHeadroom: { value: null, reason: "NO-FIELD" },
  });
});

it("recomputes tampered headroom and excludes an incomplete stored adoption", async () => {
  const file = await path();
  await writeFile(
    file,
    JSON.stringify({
      ...execution(),
      schemaVersion: 1,
      engine: "strata",
      quality: undefined,
      memoryHeadroom: { value: 999999, unit: "MiB" },
    }),
  );
  expect(await loadStrataResult(file)).toMatchObject({
    adoption: "undetermined",
    memoryHeadroom: { value: 4096 },
  });
});

it("refuses overwriting an existing execution artifact", async () => {
  const file = await path();
  await saveStrataResult(file, execution());
  const before = await readFile(file, "utf8");
  await expect(saveStrataResult(file, execution())).rejects.toMatchObject({
    code: "EEXIST",
  });
  expect(await readFile(file, "utf8")).toBe(before);
});

it("rejects unsupported artifacts, malformed JSON and read failures", async () => {
  const file = await path();
  await expect(loadStrataResult(file)).rejects.toMatchObject({
    code: "ENOENT",
  });
  for (const content of [
    "{",
    "null",
    '{"schemaVersion":2,"engine":"strata"}',
    '{"schemaVersion":1,"engine":"other"}',
  ]) {
    await writeFile(file, content);
    await expect(loadStrataResult(file)).rejects.toThrow();
  }
});

it("does not create a file for invalid execution metadata", async () => {
  const file = await path();
  await expect(saveStrataResult(file, {})).rejects.toThrow();
  await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
});
