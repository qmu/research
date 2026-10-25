import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  saveSnapshotRecoveryRequest,
  snapshotFailureReasons,
} from "./recovery-store.js";

const input = {
  targetCommit: "a".repeat(40),
  runnerVersion: "local-inference/4",
  fixtureIds: ["sample@1"],
  executionVersion: 2,
  source: {
    runId: "failed-run",
    targetCommit: "a".repeat(40),
    runnerVersion: "local-inference/4",
  },
  reason: "SNAPSHOT-JSON-INVALID",
};
const directories: string[] = [];
async function directory() {
  const path = await mkdtemp(join(tmpdir(), "recovery-store-"));
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
async function record(path: string) {
  const files = await readdir(path);
  expect(files).toHaveLength(1);
  return join(path, files[0]);
}
function cli(path: string, data: unknown) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "src/entrypoints/save-snapshot-recovery-request.ts",
          "--store",
          path,
        ],
        { stdio: "pipe" },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.stdin.end(JSON.stringify(data));
    },
  );
}

it.each(snapshotFailureReasons)(
  "stores complete provenance and fixed reason %s across restarts",
  async (reason) => {
    const path = await directory();
    const data = {
      ...input,
      reason,
      debug: "private-marker",
      source: { ...input.source, path: "private-marker" },
    };
    const first = await cli(path, data);
    expect(first.code).toBe(0);
    const saved = JSON.parse(await readFile(await record(path), "utf8"));
    expect(saved).toMatchObject({
      source: input.source,
      reason,
      executionVersion: 2,
      requiresNewExecutionId: true,
      requiresNewArtifact: true,
    });
    expect(JSON.stringify(saved)).not.toContain("private-marker");
    expect(await cli(path, data)).toEqual({
      code: 0,
      stderr: "",
      stdout: JSON.stringify({ changed: false, request: saved }) + "\n",
    });
  },
);

it.each([undefined, null, "", "raw private error", "SNAPSHOT-JSON-INVALID\n"])(
  "rejects non-fixed reason %j before storage",
  async (reason) => {
    const parent = await directory();
    await expect(
      saveSnapshotRecoveryRequest(join(parent, "new"), { ...input, reason }),
    ).rejects.toThrow("INVALID-RECOVERY-REQUEST");
    expect(await readdir(parent)).toEqual([]);
  },
);

it.each([
  undefined,
  null,
  { ...input.source, targetCommit: "b".repeat(40) },
  { ...input.source, runnerVersion: "local-inference/3" },
])("requires the original complete source %j", async (source) => {
  const parent = await directory();
  await expect(
    saveSnapshotRecoveryRequest(join(parent, "new"), { ...input, source }),
  ).rejects.toThrow();
  expect(await readdir(parent)).toEqual([]);
});

it("rejects stale writes including previously valid retries, preserving the newest bytes", async () => {
  const path = await directory();
  await saveSnapshotRecoveryRequest(path, input);
  const next = {
    ...input,
    executionVersion: 3,
    source: { ...input.source, runId: "next-failed-run" },
    reason: "SNAPSHOT-READ-FAILED",
  };
  expect((await saveSnapshotRecoveryRequest(path, next)).changed).toBe(true);
  const file = await record(path);
  const bytes = await readFile(file, "utf8");
  await expect(saveSnapshotRecoveryRequest(path, input)).rejects.toThrow(
    "RECOVERY-STORE-STALE",
  );
  expect(await readFile(file, "utf8")).toBe(bytes);
  expect(JSON.parse(bytes)).toMatchObject(next);
});

it.each([
  { reason: "SNAPSHOT-READ-FAILED" },
  { source: { ...input.source, runId: "another-run" } },
])("rejects same-generation substitution %j", async (change) => {
  const path = await directory();
  await saveSnapshotRecoveryRequest(path, input);
  const file = await record(path),
    bytes = await readFile(file, "utf8");
  await expect(
    saveSnapshotRecoveryRequest(path, { ...input, ...change }),
  ).rejects.toThrow("RECOVERY-STORE-CONFLICT");
  expect(await readFile(file, "utf8")).toBe(bytes);
});

it("fails closed on corrupt storage and abandoned locks", async () => {
  const path = await directory();
  await saveSnapshotRecoveryRequest(path, input);
  const file = await record(path);
  await writeFile(file, "broken");
  await expect(
    saveSnapshotRecoveryRequest(path, { ...input, executionVersion: 3 }),
  ).rejects.toThrow("RECOVERY-STORE-CORRUPT");
  expect(await readFile(file, "utf8")).toBe("broken");
  await mkdir(`${file}.lock`);
  await expect(saveSnapshotRecoveryRequest(path, input)).rejects.toThrow(
    "RECOVERY-STORE-BUSY",
  );
});

it("serializes competing processes without mixing provenance or permitting stale replacement", async () => {
  const path = await directory();
  const candidates = Array.from({ length: 8 }, (_, index) => ({
    ...input,
    executionVersion: index + 1,
    source: { ...input.source, runId: `failed-${index}` },
    reason: snapshotFailureReasons[index % 3],
  }));
  const results = await Promise.all(candidates.map((data) => cli(path, data)));
  expect(results.some((result) => result.code === 0)).toBe(true);
  for (const result of results.filter((result) => result.code !== 0))
    expect(result).toEqual({
      code: 1,
      stdout: "",
      stderr: "RECOVERY-SAVE-FAILED\n",
    });
  // A busy writer can retry; once all processes finish the highest version wins.
  await saveSnapshotRecoveryRequest(path, candidates[7]);
  const file = await record(path),
    bytes = await readFile(file, "utf8");
  expect(JSON.parse(bytes)).toMatchObject(candidates[7]);
  expect(await cli(path, candidates[0])).toEqual({
    code: 1,
    stdout: "",
    stderr: "RECOVERY-SAVE-FAILED\n",
  });
  expect(await readFile(file, "utf8")).toBe(bytes);
}, 15000);

it("does not change the independent commit/runner/fixture scopes", async () => {
  const path = await directory();
  await saveSnapshotRecoveryRequest(path, input);
  await saveSnapshotRecoveryRequest(path, {
    ...input,
    fixtureIds: ["other@1"],
    executionVersion: 1,
  });
  expect(await readdir(path)).toHaveLength(2);
});
