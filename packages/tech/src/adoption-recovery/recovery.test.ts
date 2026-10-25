import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import fixture from "./fixtures/missing-metrics.json";
import type {
  RecoverableResult,
  RemeasurementBinding,
} from "../local-inference/domain/remeasurement.js";
import { remeasurementRequest } from "../local-inference/domain/remeasurement.js";
import {
  beginExecution,
  completeExecution,
} from "../local-inference/vendors/versioned-result.js";
import { saveRemeasurementRequest } from "../local-inference/vendors/remeasurement-request.js";
import {
  createAdoptionIntent,
  inspectAdoptionRequest,
  missingRows,
  recreateAdoptionIntent,
} from "./domain/intent.js";
import { saveAdoptionRecoveryIntent } from "./store.js";
const paths: string[] = [];
afterEach(async () => {
  await Promise.all(
    paths.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "adoption-recovery-"));
  paths.push(dir);
  const output = join(dir, "result.json");
  const execution = await beginExecution(output);
  const binding: RemeasurementBinding = {
    ...structuredClone(fixture.binding),
    execution,
  };
  const value = structuredClone(fixture.result) as RecoverableResult;
  const result = await completeExecution(
    output,
    {
      ...execution,
      targetCommit: binding.targetCommit,
      runnerVersion: binding.runnerVersion,
    },
    value,
  );
  const create = () => createAdoptionIntent(result, binding);
  const save = (intent: unknown, now: number) =>
    saveAdoptionRecoveryIntent(output, binding, intent, { now, ttlMs: 100 });
  return { dir, output, binding, result, create, save };
}
it("joins both metric reasons into one request and keeps exact retries byte-stable", async () => {
  const f = await setup();
  expect(missingRows(f.result, f.binding).map((r) => r.reason)).toEqual([
    "MEASURE-FAILED",
    "NO-FIELD",
  ]);
  const before = JSON.parse(await readFile(f.output, "utf8"));
  const first = await f.save(f.create(), 1000);
  expect(first.targets).toEqual([
    {
      runId: "synthetic-row-1",
      engine: "ollama",
      missingMetrics: ["ttft", "peak_rss"],
    },
  ]);
  const after = JSON.parse(await readFile(f.output, "utf8"));
  expect(after.runs).toEqual(before.runs);
  expect(after.remeasurementRequest).toEqual(first);
  const bytes = await readFile(f.output, "utf8");
  expect(await f.save(f.create(), 1050)).toEqual(first);
  expect(await readFile(f.output, "utf8")).toBe(bytes);
  await expect(f.save(f.create(), 1100)).rejects.toThrow(
    "RECOVERY-TTL-EXPIRED",
  );
});
it("refuses active recreation and rechecks client-forged expiry under execution lock", async () => {
  const f = await setup();
  const first = await f.save(f.create(), 1000);
  expect(() =>
    recreateAdoptionIntent(f.result, f.binding, first, 1099),
  ).toThrow("RECOVERY-NOT-EXPIRED");
  const forged = {
    ...first,
    lifecycle: {
      generation: 1,
      ...first.lifecycle,
      createdAt: 0,
      expiresAt: 1,
    },
  };
  const intent = recreateAdoptionIntent(f.result, f.binding, forged, 1050);
  await expect(f.save(intent, 1050)).rejects.toThrow("RECOVERY-NOT-EXPIRED");
});
it("recreates at expiry, deduplicates concurrent requests and rejects old predecessors", async () => {
  const f = await setup();
  const first = await f.save(f.create(), 1000);
  const intent = recreateAdoptionIntent(f.result, f.binding, first, 1100);
  const results = await Promise.all([
    f.save(intent, 1100),
    f.save(intent, 1100),
    f.save(intent, 1100),
  ]);
  expect(new Set(results.map((r) => r.requestId)).size).toBe(1);
  const second = results[0];
  expect(second.requestId).not.toBe(first.requestId);
  expect(second.lifecycle?.generation).toBe(2);
  expect(second.binding).toEqual(first.binding);
  expect(second.targets).toEqual(first.targets);
  expect((await f.save(intent, 1150)).lifecycle?.expiresAt).toBe(1200);
  const third = await f.save(
    recreateAdoptionIntent(f.result, f.binding, second, 1200),
    1200,
  );
  expect(third.lifecycle?.generation).toBe(3);
  const bytes = await readFile(f.output, "utf8");
  await expect(f.save(intent, 1201)).rejects.toThrow("RECOVERY-REQUEST-STALE");
  expect(await readFile(f.output, "utf8")).toBe(bytes);
});
it("makes an original runner request recreatable without silently granting it a deadline", async () => {
  const f = await setup();
  const legacy = await saveRemeasurementRequest(f.output, f.binding);
  expect(inspectAdoptionRequest(f.result, f.binding, legacy, 1000).reason).toBe(
    "RECOVERY-EXPIRY-UNKNOWN",
  );
  await expect(f.save(f.create(), 1000)).rejects.toThrow(
    "RECOVERY-EXPIRY-UNKNOWN",
  );
  const next = await f.save(
    recreateAdoptionIntent(f.result, f.binding, legacy, 1000),
    1000,
  );
  expect(next.lifecycle?.generation).toBe(2);
});
it.each([
  "targetCommit",
  "runnerVersion",
  "fixtureSha256",
  "fixedTier",
  "execution",
])("rejects mixed uploaded %s and preserves artifact", async (key) => {
  const f = await setup();
  const first = await f.save(f.create(), 1000);
  const bad = structuredClone(first);
  (bad.binding as Record<string, unknown>)[key] =
    key === "fixedTier" ? { label: "32 GiB", totalMiB: 32768 } : "different";
  expect(() =>
    inspectAdoptionRequest(f.result, f.binding, bad, 1100),
  ).toThrow();
  const bytes = await readFile(f.output, "utf8");
  const intent = {
    action: "recreate",
    binding: bad.binding,
    previousRequestId: first.requestId,
    generation: 2,
  };
  await expect(f.save(intent, 1100)).rejects.toThrow();
  expect(await readFile(f.output, "utf8")).toBe(bytes);
});
it.each([
  { label: "32 GiB", totalMiB: 16384 },
  { label: "16 GiB", totalMiB: 32768 },
])("rejects tier label or capacity mismatch %j", async (fixedTier) => {
  const f = await setup();
  expect(() =>
    createAdoptionIntent(f.result, { ...f.binding, fixedTier }),
  ).toThrow("REMEASUREMENT-BINDING-MISMATCH");
});
it("rejects old execution after a newer run begins", async () => {
  const f = await setup();
  const first = await f.save(f.create(), 1000);
  const intent = recreateAdoptionIntent(f.result, f.binding, first, 1100);
  await beginExecution(f.output);
  const bytes = await readFile(f.output, "utf8");
  await expect(f.save(intent, 1100)).rejects.toThrow("STALE-EXECUTION");
  expect(await readFile(f.output, "utf8")).toBe(bytes);
});
it("rejects mixed row run ID or missing metric targets in uploaded request", async () => {
  const f = await setup();
  const first = await f.save(f.create(), 1000);
  const bad = structuredClone(first);
  bad.targets[0].runId = "other";
  expect(() => inspectAdoptionRequest(f.result, f.binding, bad, 1100)).toThrow(
    "RECOVERY-IDENTITY-MISMATCH",
  );
  bad.targets[0].runId = first.targets[0].runId;
  bad.targets[0].missingMetrics = ["ttft"];
  expect(() => inspectAdoptionRequest(f.result, f.binding, bad, 1100)).toThrow(
    "RECOVERY-IDENTITY-MISMATCH",
  );
});
it("rejects malformed lifecycle, generation overflow and unknown missing reasons", async () => {
  const f = await setup();
  const first = await f.save(f.create(), 1000);
  expect(() =>
    inspectAdoptionRequest(
      f.result,
      f.binding,
      { ...first, lifecycle: { generation: 1, createdAt: 1000 } },
      1100,
    ),
  ).toThrow("INVALID-REQUEST-LIFECYCLE");
  expect(() =>
    recreateAdoptionIntent(
      f.result,
      f.binding,
      {
        ...first,
        lifecycle: {
          generation: Number.MAX_SAFE_INTEGER,
          previousRequestId: "older-request",
          createdAt: 0,
          expiresAt: 1,
        },
      },
      1100,
    ),
  ).toThrow("RECOVERY-GENERATION-LIMIT");
  const bad = structuredClone(f.result);
  (bad.runs[0].metrics.ttft as { reason?: string }).reason = "UNKNOWN";
  expect(() => createAdoptionIntent(bad, f.binding)).toThrow(
    "INVALID-MISSING-REASON",
  );
});
it("refuses healthy metrics and corrupt existing requests without rewriting", async () => {
  const f = await setup();
  const healthy = structuredClone(f.result);
  healthy.runs[0].metrics.ttft.value = 0;
  healthy.runs[0].metrics.peak_rss.value = 0;
  expect(() => createAdoptionIntent(healthy, f.binding)).toThrow(
    "RECOVERY-NOT-MISSING",
  );
  const request = remeasurementRequest(f.result, f.binding, "old");
  if (!request) throw new Error("Expected request");
  request.binding.fixedTier = { label: "16 GiB", totalMiB: 32768 };
  await writeFile(
    f.output,
    JSON.stringify({ ...f.result, remeasurementRequest: request }),
  );
  const bytes = await readFile(f.output, "utf8");
  await expect(f.save(f.create(), 1000)).rejects.toThrow();
  expect(await readFile(f.output, "utf8")).toBe(bytes);
});
it("ignores property order but rejects extra intent fields", async () => {
  const f = await setup();
  const intent = f.create();
  const ordered = {
    missing: intent.missing,
    binding: intent.binding,
    action: intent.action,
  };
  expect((await f.save(ordered, 1000)).requestId).toBeTruthy();
  await expect(
    f.save({ ...intent, command: "DO-NOT-COPY" }, 1000),
  ).rejects.toThrow("RECOVERY-IDENTITY-MISMATCH");
});
it("CLI uses independent binding, saves in the original artifact and hides untrusted input errors", async () => {
  const f = await setup();
  const ctx = join(f.dir, "context.json"),
    file = join(f.dir, "intent.json");
  await writeFile(ctx, JSON.stringify({ binding: f.binding }));
  await writeFile(file, JSON.stringify(f.create()));
  const run = () =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/save-adoption-recovery.ts",
        f.output,
        ctx,
        file,
      ],
      { encoding: "utf8" },
    );
  const result = run();
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout).binding).toEqual(f.binding);
  expect(
    JSON.parse(await readFile(f.output, "utf8")).remeasurementRequest.requestId,
  ).toBe(JSON.parse(result.stdout).requestId);
  await writeFile(file, '{"unexpected":"DO-NOT-EXPOSE"}');
  const bad = run();
  expect(bad.status).toBe(1);
  expect(bad.stdout).toBe("");
  expect(bad.stderr).toBe("ADOPTION-RECOVERY-SAVE-FAILED\n");
});

it("keeps the original save API compatible with an active managed request", async () => {
  const f = await setup();
  const now = Date.now();
  const first = await f.save(f.create(), now);
  expect(await saveRemeasurementRequest(f.output, f.binding)).toEqual(first);
  const bytes = await readFile(f.output, "utf8");
  expect(await saveRemeasurementRequest(f.output, f.binding)).toEqual(first);
  expect(await readFile(f.output, "utf8")).toBe(bytes);
});

it("refuses stale missing reasons from a page snapshot before saving", async () => {
  const f = await setup();
  const intent = f.create();
  const changed = structuredClone(f.result);
  (changed.runs[0].metrics.ttft as { reason?: string }).reason = "NO-FIELD";
  await writeFile(f.output, JSON.stringify(changed));
  const bytes = await readFile(f.output, "utf8");
  await expect(f.save(intent, 1000)).rejects.toThrow(
    "RECOVERY-IDENTITY-MISMATCH",
  );
  expect(await readFile(f.output, "utf8")).toBe(bytes);
});
