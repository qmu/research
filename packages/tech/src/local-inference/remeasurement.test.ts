import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { engines } from "./domain/result.js";
import {
  remeasurementRequest,
  type RemeasurementBinding,
} from "./domain/remeasurement.js";
import { runLocalInference, runnerVersion } from "./run.js";
import { saveRemeasurementRequest } from "./vendors/remeasurement-request.js";
import {
  beginExecution,
  completeExecution,
} from "./vendors/versioned-result.js";

vi.mock("./vendors/provenance.js", () => ({
  readTargetCommit: () => "a".repeat(40),
}));
vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof fs>()),
  rename: vi.fn((...args: Parameters<typeof fs.rename>) =>
    actual.rename(...args),
  ),
}));
const actual = await vi.importActual<typeof fs>("node:fs/promises");
const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.mocked(fs.rename)
    .mockReset()
    .mockImplementation((...args) => actual.rename(...args));
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => actual.rm(dir, { recursive: true, force: true })),
  );
});
async function fixture(ttft: number | null = null, rss: number | null = null) {
  const dir = await actual.mkdtemp(join(tmpdir(), "remeasurement-"));
  directories.push(dir);
  const output = join(dir, "result.json");
  const execution = await beginExecution(output);
  const binding: RemeasurementBinding = {
    execution,
    targetCommit: "a".repeat(40),
    runnerVersion,
    fixtureSha256: "b".repeat(64),
    fixedTier: { label: "16 GiB", totalMiB: 16384 },
  };
  const result = await completeExecution(
    output,
    { ...execution, targetCommit: binding.targetCommit, runnerVersion },
    {
      fixtureSha256: binding.fixtureSha256,
      fixedTier: binding.fixedTier,
      runs: [
        {
          runId: "request-row-1",
          engine: engines[0],
          targetCommit: binding.targetCommit,
          runnerVersion,
          purpose: "adoption-target" as const,
          metrics: { ttft: { value: ttft }, peak_rss: { value: rss } },
        },
      ],
    },
  );
  return { output, binding, result, dir };
}

it.each([
  [null, null, ["ttft", "peak_rss"]],
  [null, 10, ["ttft"]],
  [0, null, ["peak_rss"]],
] as const)(
  "saves one request for TTFT=%s RSS=%s and deduplicates concurrent callers",
  async (ttft, rss, missing) => {
    const { output, binding, result } = await fixture(ttft, rss);
    let publications = 0;
    vi.mocked(fs.rename).mockImplementation(async (source, target) => {
      if (target === output) {
        publications++;
        const pending = JSON.parse(await actual.readFile(source, "utf8"));
        expect(pending.runs).toEqual(result.runs);
        expect(pending.remeasurementRequest.binding).toEqual(binding);
        expect(JSON.parse(await actual.readFile(output, "utf8"))).toEqual(
          result,
        );
      }
      await actual.rename(source, target);
    });
    const requests = await Promise.all(
      Array.from({ length: 5 }, () =>
        saveRemeasurementRequest(output, binding),
      ),
    );
    expect(publications).toBe(1);
    expect(new Set(requests.map((request) => request?.requestId)).size).toBe(1);
    expect(requests[0]?.targets).toEqual([
      { runId: "request-row-1", engine: engines[0], missingMetrics: missing },
    ]);
    const bytes = await actual.readFile(output, "utf8");
    const reordered = {
      fixedTier: { totalMiB: 16384, label: "16 GiB" },
      fixtureSha256: binding.fixtureSha256,
      runnerVersion,
      targetCommit: binding.targetCommit,
      execution: binding.execution,
    };
    expect(await saveRemeasurementRequest(output, reordered)).toEqual(
      requests[0],
    );
    expect(await actual.readFile(output, "utf8")).toBe(bytes);
  },
);

it("binds prompt and target fixture changes while excluding endpoint/PID details", async () => {
  const { output } = await fixture();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("data: [DONE]\n\n")),
  );
  const input = {
    fixedTier: { label: "16 GiB", totalMiB: 16384 },
    messages: [{ role: "user", content: "original" }],
    targets: engines.map((engine) => ({
      engine,
      baseUrl: "http://localhost/v1",
      model: "original",
      runtimeVersion: "test",
      condition: { context: 1024 },
    })),
  };
  const original = await runLocalInference(input, output);
  for (const change of ["prompt", "model", "runtime", "condition"] as const) {
    const changed = structuredClone(input);
    if (change === "prompt") changed.messages[0].content = "different";
    if (change === "model") changed.targets[0].model = "different";
    if (change === "runtime") changed.targets[0].runtimeVersion = "different";
    if (change === "condition") changed.targets[0].condition.context = 2048;
    const result = await runLocalInference(changed, output);
    expect(result.fixtureSha256).not.toBe(original.fixtureSha256);
    expect(result.remeasurementRequest?.binding.fixtureSha256).toBe(
      result.fixtureSha256,
    );
  }
  const relocated = {
    ...input,
    targets: input.targets.map((target) => ({
      ...target,
      baseUrl: "http://127.0.0.1:8000/v1",
      memoryPid: 123,
    })),
  };
  expect((await runLocalInference(relocated, output)).fixtureSha256).toBe(
    original.fixtureSha256,
  );
});

it("snapshots the config so caller mutations during fetch cannot change the bound fixture/tier", async () => {
  const { output } = await fixture();
  const input = {
    fixedTier: { label: "16 GiB", totalMiB: 16384 },
    messages: [{ role: "user", content: "original" }],
    targets: engines.map((engine) => ({
      engine,
      baseUrl: "http://localhost/v1",
      model: "original",
      runtimeVersion: "test",
      condition: {},
    })),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options: RequestInit) => {
      expect(JSON.parse(options.body as string)).toMatchObject({
        model: "original",
        messages: [{ role: "user", content: "original" }],
      });
      input.fixedTier.totalMiB = 32768;
      input.messages[0].content = "changed";
      input.targets[1].model = "changed";
      return new Response("data: [DONE]\n\n");
    }),
  );
  const result = await runLocalInference(input, output);
  expect(result.fixedTier).toEqual({ label: "16 GiB", totalMiB: 16384 });
  expect(result.remeasurementRequest?.binding.fixedTier).toEqual(
    result.fixedTier,
  );
  expect(result.runs.every((row) => row.model === "original")).toBe(true);
});

it("rejects an existing request whose stored binding was changed", async () => {
  const { output, binding } = await fixture();
  await saveRemeasurementRequest(output, binding);
  const corrupted = JSON.parse(await actual.readFile(output, "utf8"));
  corrupted.remeasurementRequest.binding.fixedTier.totalMiB = 32768;
  const bytes = JSON.stringify(corrupted);
  await actual.writeFile(output, bytes);
  await expect(saveRemeasurementRequest(output, binding)).rejects.toThrow(
    "INVALID-REMEASUREMENT-REQUEST",
  );
  expect(await actual.readFile(output, "utf8")).toBe(bytes);
});

it("does not request remeasurement of real zero values", async () => {
  const { output, binding } = await fixture(0, 0);
  const bytes = await actual.readFile(output, "utf8");
  expect(await saveRemeasurementRequest(output, binding)).toBeNull();
  expect(await actual.readFile(output, "utf8")).toBe(bytes);
});

it.each([
  "commit",
  "runner",
  "fixture",
  "tier-label",
  "tier-capacity",
  "execution",
])("rejects changed %s without touching existing bytes", async (field) => {
  const { output, binding } = await fixture();
  await saveRemeasurementRequest(output, binding);
  const bytes = await actual.readFile(output, "utf8");
  const changed = structuredClone(binding);
  if (field === "commit") changed.targetCommit = "c".repeat(40);
  if (field === "runner") changed.runnerVersion = "different/1";
  if (field === "fixture") changed.fixtureSha256 = "c".repeat(64);
  if (field === "tier-label")
    changed.fixedTier = { ...changed.fixedTier, label: "other" };
  if (field === "tier-capacity")
    changed.fixedTier = { ...changed.fixedTier, totalMiB: 32768 };
  if (field === "execution") changed.execution.version++;
  await expect(saveRemeasurementRequest(output, changed)).rejects.toThrow(
    field === "execution"
      ? "STALE-EXECUTION"
      : "REMEASUREMENT-BINDING-MISMATCH",
  );
  expect(await actual.readFile(output, "utf8")).toBe(bytes);
});

it("rejects recovery while a newer measurement reservation is active", async () => {
  const { output, binding } = await fixture();
  const bytes = await actual.readFile(output, "utf8");
  await beginExecution(output);
  await expect(saveRemeasurementRequest(output, binding)).rejects.toThrow(
    "STALE-EXECUTION",
  );
  expect(await actual.readFile(output, "utf8")).toBe(bytes);
});

it("leaves the prior artifact and reservation intact on request publication failure", async () => {
  const { output, binding, dir } = await fixture();
  const bytes = await actual.readFile(output, "utf8");
  const state = await actual.readFile(output + ".execution.json", "utf8");
  vi.mocked(fs.rename).mockImplementation(async (source, target) => {
    if (target === output) throw new Error("publication failed");
    await actual.rename(source, target);
  });
  await expect(saveRemeasurementRequest(output, binding)).rejects.toThrow(
    "publication failed",
  );
  expect(await actual.readFile(output, "utf8")).toBe(bytes);
  expect(await actual.readFile(output + ".execution.json", "utf8")).toBe(state);
  expect((await actual.readdir(dir)).sort()).toEqual([
    "result.json",
    "result.json.execution.json",
  ]);
});

it("rejects mixed row provenance, duplicate row IDs and malformed metrics", async () => {
  const { result, binding } = await fixture();
  for (const field of ["targetCommit", "runnerVersion"] as const) {
    const mixed = structuredClone(result);
    mixed.runs[0][field] = "different";
    expect(() => remeasurementRequest(mixed, binding, "id")).toThrow(
      "REMEASUREMENT-BINDING-MISMATCH",
    );
  }
  expect(() =>
    remeasurementRequest(
      { ...result, runs: [...result.runs, ...result.runs] },
      binding,
      "id",
    ),
  ).toThrow("REMEASUREMENT-BINDING-MISMATCH");
  const malformed = structuredClone(result);
  malformed.runs[0].metrics.ttft.value = NaN;
  expect(() => remeasurementRequest(malformed, binding, "id")).toThrow(
    "INVALID-REMEASUREMENT-METRIC",
  );
});

it("publishes all missing-metric requests with their captured fixture/tier in one runner rename", async () => {
  const { output } = await fixture();
  const tier = { label: "16 GiB", totalMiB: 16384, secret: "do-not-persist" };
  const input = {
    fixedTier: tier,
    messages: [{ role: "user", content: "hello" }],
    targets: engines.map((engine) => ({
      engine,
      baseUrl: "http://localhost/v1",
      model: "fixture",
      runtimeVersion: "test",
      condition: {},
    })),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("data: [DONE]\n\n")),
  );
  let publications = 0;
  vi.mocked(fs.rename).mockImplementation(async (source, target) => {
    if (target === output) {
      publications++;
      const pending = JSON.parse(await actual.readFile(source, "utf8"));
      expect(pending.remeasurementRequest.binding).toMatchObject({
        targetCommit: "a".repeat(40),
        runnerVersion,
        fixedTier: { label: tier.label, totalMiB: tier.totalMiB },
        fixtureSha256: pending.fixtureSha256,
        execution: {
          runId: pending.execution.runId,
          version: pending.execution.version,
        },
      });
      const warmupRows = pending.runs.filter(
        (row: { purpose: string }) => row.purpose === "warmup",
      );
      expect(warmupRows).toHaveLength(1);
      expect(warmupRows[0].engine).toBe("strata");
      expect(pending.remeasurementRequest.targets).toEqual(
        pending.runs
          .filter(
            (row: { purpose: string }) => row.purpose === "adoption-target",
          )
          .map((row: { runId: string; engine: string }) => ({
            runId: row.runId,
            engine: row.engine,
            missingMetrics: ["ttft", "peak_rss"],
          })),
      );
      // The warm-up row's own missing metrics must never surface as a
      // remeasurement target: that would be a warm-up value leaking into
      // the adoption decision this request feeds.
      expect(
        pending.remeasurementRequest.targets.some(
          (t: { runId: string }) => t.runId === warmupRows[0].runId,
        ),
      ).toBe(false);
    }
    await actual.rename(source, target);
  });
  const result = await runLocalInference(input, output);
  expect(publications).toBe(1);
  expect(await actual.readFile(output, "utf8")).not.toContain("do-not-persist");
  expect(JSON.parse(await actual.readFile(output, "utf8"))).toEqual(result);
  if (!result.remeasurementRequest) throw new Error("missing request");
  expect(
    await saveRemeasurementRequest(output, result.remeasurementRequest.binding),
  ).toEqual(result.remeasurementRequest);
});

it.each([
  null,
  {},
  { label: "", totalMiB: 16384 },
  { label: "16 GiB", totalMiB: 0 },
  { label: "16 GiB", totalMiB: 1.5 },
])(
  "rejects invalid fixedTier %j before reserving output",
  async (fixedTier) => {
    const { output } = await fixture();
    const bytes = await actual.readFile(output, "utf8");
    const state = await actual.readFile(output + ".execution.json", "utf8");
    await expect(runLocalInference({ fixedTier }, output)).rejects.toThrow(
      "Invalid fixed memory tier",
    );
    expect(await actual.readFile(output, "utf8")).toBe(bytes);
    expect(await actual.readFile(output + ".execution.json", "utf8")).toBe(
      state,
    );
  },
);
