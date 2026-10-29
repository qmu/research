import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { remeasurementRequest } from "./domain/request.js";
import { saveRemeasurementRequest } from "./request-store.js";

const identity = {
  targetCommit: "a".repeat(40),
  runnerVersion: "local-inference/4",
  fixtureIds: ["fixture-b@1", "fixture-a@2"],
  executionVersion: 1,
};
const directories: string[] = [];
async function store() {
  const path = await mkdtemp(join(tmpdir(), "remeasurement-test-"));
  directories.push(path);
  return path;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function cli(directory: string, input: unknown) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "src/entrypoints/save-remeasurement-request.ts",
          "--store",
          directory,
        ],
        { stdio: "pipe" },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (data) => {
        stdout += data;
      });
      child.stderr.on("data", (data) => {
        stderr += data;
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.stdin.end(JSON.stringify(input));
    },
  );
}

describe("execution-versioned remeasurement persistence", () => {
  it("deduplicates reordered/repeated fixture IDs and strips untrusted extra fields", async () => {
    const directory = await store();
    const first = await saveRemeasurementRequest(directory, identity);
    const second = await saveRemeasurementRequest(directory, {
      ...identity,
      fixtureIds: ["fixture-a@2", "fixture-b@1", "fixture-a@2"],
      idempotencyKey: "../../secret",
      token: "not-persisted",
    });
    expect(first.created).toBe(true);
    expect(second).toEqual({ ...first, created: false });
    expect(await readdir(directory)).toEqual([
      `${first.request.idempotencyKey}.json`,
    ]);
    expect(
      await readFile(
        join(directory, `${first.request.idempotencyKey}.json`),
        "utf8",
      ),
    ).not.toContain("not-persisted");
  });

  it.each([
    { targetCommit: "b".repeat(40) },
    { runnerVersion: "local-inference/3" },
    { fixtureIds: ["fixture-a@3", "fixture-b@1"] },
    { fixtureIds: ["fixture-a@2"] },
    { executionVersion: 2 },
  ])("saves a different identity separately: %j", async (change) => {
    const directory = await store();
    const first = await saveRemeasurementRequest(directory, identity);
    const second = await saveRemeasurementRequest(directory, {
      ...identity,
      ...change,
    });
    expect(second.created).toBe(true);
    expect(second.request.idempotencyKey).not.toBe(
      first.request.idempotencyKey,
    );
    expect(await readdir(directory)).toHaveLength(2);
  });

  it.each([
    { targetCommit: "main" },
    { targetCommit: "a".repeat(40) + "\n" },
    { runnerVersion: "local-inference/4\n" },
    { fixtureIds: ["fixture-a\n"] },
    { fixtureIds: Array(1) },
    { targetCommit: undefined },
    { runnerVersion: "" },
    { runnerVersion: "local-inference/999" },
    { fixtureIds: [] },
    { fixtureIds: ["../private"] },
    { fixtureIds: [1] },
    { executionVersion: 0 },
    { executionVersion: -1 },
    { executionVersion: 1.5 },
    { executionVersion: "1" },
    { executionVersion: undefined },
    { executionVersion: Infinity },
  ])("rejects invalid identity before storage: %j", async (change) => {
    const directory = await store();
    await expect(
      saveRemeasurementRequest(join(directory, "new"), {
        ...identity,
        ...change,
      }),
    ).rejects.toThrow("INVALID-REMEASUREMENT-IDENTITY");
    expect(await readdir(directory)).toEqual([]);
  });

  it("publishes exactly one complete record across independent processes and restarts", async () => {
    const directory = await store();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => cli(directory, identity)),
    );
    expect(
      results.every((result) => result.code === 0 && result.stderr === ""),
    ).toBe(true);
    const saved = results.map((result) => JSON.parse(result.stdout));
    expect(saved.filter((result) => result.created)).toHaveLength(1);
    expect(
      new Set(saved.map((result) => result.request.idempotencyKey)).size,
    ).toBe(1);
    const retry = await cli(directory, identity);
    expect(retry.code).toBe(0);
    expect(JSON.parse(retry.stdout).created).toBe(false);
    expect(await readdir(directory)).toEqual([
      `${saved[0].request.idempotencyKey}.json`,
    ]);
  }, 15000);

  it("refuses a corrupt existing record without overwriting or claiming success", async () => {
    const directory = await store();
    const path = join(
      directory,
      `${remeasurementRequest(identity).idempotencyKey}.json`,
    );
    await writeFile(path, "broken");
    await expect(saveRemeasurementRequest(directory, identity)).rejects.toThrow(
      "REMEASUREMENT-STORE-CONFLICT",
    );
    expect(await readFile(path, "utf8")).toBe("broken");
    expect(await readdir(directory)).toHaveLength(1);
  });

  it("reports storage failures without leaking paths or input through the CLI", async () => {
    const directory = await store();
    const path = join(directory, "private-file");
    await writeFile(path, "keep");
    const result = await cli(path, identity);
    expect(result).toEqual({
      code: 1,
      stdout: "",
      stderr: "REMEASUREMENT-SAVE-FAILED\n",
    });
    expect(await readFile(path, "utf8")).toBe("keep");
  });
});
