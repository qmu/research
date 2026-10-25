import { createHash, randomUUID } from "node:crypto";
import {
  assertExecutionCurrent,
  beginExecution,
  completeExecution,
} from "./vendors/versioned-result.js";
import { readTargetCommit } from "./vendors/provenance.js";
import {
  engines,
  metrics,
  type Engine,
  type RunPurpose,
} from "./domain/result.js";
import { startPeakRss } from "./vendors/peak-rss.js";
import { peakRssReading } from "./domain/peak-memory.js";
import type { PeakRss } from "./domain/peak-memory.js";
import {
  remeasurementRequest,
  validFixedTier,
} from "./domain/remeasurement.js";
import type { FixedCapacityTier } from "../local-inference-memory-margin/domain/types.js";
import {
  defaultOutputBudgetChars,
  observeStream,
  streamFailureReason,
  type StreamFailureReason,
} from "./vendors/stream.js";

/** Bump when the runner's measurement or persistence semantics change. */
export const runnerVersion = "local-inference/8";

/** Only fixed public syntax survives. Unknown arguments, paths, environment
 * assignments, headers, URLs and option values are redacted BEFORE hashing.
 * Accept argv tokens, not a shell command: whitespace inside a token is data.
 * No environment is read and neither raw nor normalized argv is persisted.
 */
export function commandFingerprint(argv: readonly string[]): string {
  const publicTokens = new Set([
    "node",
    "nodejs",
    "tsx",
    "npm",
    "run",
    "local-inference",
    "run-local-inference.ts",
    "--import",
    "tsx/esm",
    "--",
  ]);
  const normalized = argv.map((token, index) => {
    // Normalize only the executable and the known runner path; never trim or
    // split arguments, which would collapse distinct argument boundaries.
    const name = token.replaceAll("\\", "/").split("/").at(-1) ?? "";
    if (index === 0 && ["node", "nodejs", "tsx", "npm"].includes(name))
      return name === "nodejs" ? "node" : name;
    if (name === "run-local-inference.ts") return name;
    return publicTokens.has(token) ? token : "[REDACTED]";
  });
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export type Config = {
  fixedTier?: FixedCapacityTier;
  messages: { role: "system" | "user"; content: string }[];
  targets: {
    memoryPid?: number;
    engine: Engine;
    baseUrl: string;
    model: string;
    runtimeVersion: string;
    condition: Record<string, string | number | boolean>;
  }[];
};

export function parseConfig(input: unknown): Config {
  if (!input || typeof input !== "object")
    throw new Error("Expected config object");
  const config = input as Config;
  if (config.fixedTier !== undefined && !validFixedTier(config.fixedTier))
    throw new Error("Invalid fixed memory tier");
  if (
    !Array.isArray(config.messages) ||
    config.messages.length === 0 ||
    !config.messages.every(
      (m) =>
        m &&
        ["system", "user"].includes(m.role) &&
        typeof m.content === "string",
    )
  )
    throw new Error("Invalid messages");
  if (
    !Array.isArray(config.targets) ||
    config.targets.length !== engines.length ||
    new Set(config.targets.map((t) => t?.engine)).size !== engines.length
  )
    throw new Error("Provide each of the four engines exactly once");
  for (const target of config.targets) {
    if (
      !target ||
      !engines.includes(target.engine) ||
      typeof target.model !== "string" ||
      !target.model ||
      typeof target.runtimeVersion !== "string" ||
      !target.runtimeVersion
    )
      throw new Error("Invalid target identity");
    const url = new URL(target.baseUrl);
    if (
      target.memoryPid !== undefined &&
      (!Number.isSafeInteger(target.memoryPid) ||
        target.memoryPid <= 0 ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
      throw new Error(
        "memoryPid requires a positive PID and loopback endpoint",
      );
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error(
        "Use an HTTP base URL without credentials, query or fragment",
      );
    if (
      !target.condition ||
      typeof target.condition !== "object" ||
      Array.isArray(target.condition) ||
      !Object.values(target.condition).every(
        (v) =>
          typeof v === "string" ||
          typeof v === "boolean" ||
          (typeof v === "number" && Number.isFinite(v)),
      )
    )
      throw new Error("Invalid model condition");
  }
  return config;
}

/** Serial requests, identical prompts and sampling; endpoints and raw errors are never persisted. */
export async function runLocalInference(
  input: unknown,
  output: string,
  timeoutMs = 60_000,
  outputBudgetChars = defaultOutputBudgetChars,
  memorySampler = startPeakRss,
  argv: readonly string[] = [
    process.execPath,
    ...process.execArgv,
    ...process.argv.slice(1),
  ],
) {
  const config = structuredClone(parseConfig(input));
  const provenance = {
    targetCommit: readTargetCommit(),
    runnerVersion,
    commandSha256: commandFingerprint(argv),
  };
  const execution = { ...(await beginExecution(output)), ...provenance };
  const sampling = { temperature: 0, top_p: 1, seed: 42, max_tokens: 1024 };
  const fixtureSha256 = createHash("sha256")
    .update(
      JSON.stringify({
        messages: config.messages,
        sampling,
        targets: config.targets.map(
          ({ engine, model, runtimeVersion, condition }) => ({
            engine,
            model,
            runtimeVersion,
            condition,
          }),
        ),
      }),
    )
    .digest("hex");
  type Run = {
    runId: string;
    purpose: RunPurpose;
    runnerVersion: string;
    targetCommit: string;
    ttft: {
      value: number | null;
      unit: string;
      source?: "client" | "usage" | "os-sampler";
      reason: string;
    };
    quality: { value: null; reason: "NOT-RUN" };
    peakMemory: PeakRss;
    engine: Engine;
    model: string;
    runtimeVersion: string;
    condition: Record<string, string | number | boolean>;
    status: "measured" | "failed";
    metrics: ReturnType<typeof metrics>;
  };
  const runs: Run[] = [];
  async function requestRun(
    target: Config["targets"][number],
    purpose: RunPurpose,
  ) {
    await assertExecutionCurrent(output, execution);
    const runId = randomUUID();
    const sampler = memorySampler(target.memoryPid);
    const started = performance.now();
    let measured;
    let failureReason: StreamFailureReason | "TIMEOUT" | "REQUEST-FAILED" =
      "REQUEST-FAILED";
    let status: "measured" | "failed" = "measured";
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetch(
        `${target.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: target.model,
            messages: config.messages,
            ...sampling,
            stream: true,
            stream_options: { include_usage: true },
          }),
          signal,
        },
      );
      measured = metrics(
        await observeStream(response, started, undefined, outputBudgetChars),
      );
    } catch (error) {
      failureReason = signal.aborted
        ? "TIMEOUT"
        : (streamFailureReason(error) ?? "REQUEST-FAILED");
      status = "failed";
      measured = metrics({}, true);
    }
    const peakMemory = await sampler.stop();
    const reading = peakRssReading(peakMemory);
    measured.peak_rss =
      reading.value === null ? reading : { ...reading, source: "os-sampler" };
    runs.push({
      runId,
      purpose,
      runnerVersion: execution.runnerVersion,
      targetCommit: execution.targetCommit,
      ttft: {
        ...measured.ttft,
        reason:
          measured.ttft.value !== null
            ? "FIRST-CONTENT"
            : status === "failed"
              ? failureReason
              : "NO-CONTENT",
      },
      quality: { value: null, reason: "NOT-RUN" },
      peakMemory,
      engine: target.engine,
      model: target.model,
      runtimeVersion: target.runtimeVersion,
      condition: target.condition,
      status,
      metrics: measured,
    });
  }
  for (const target of config.targets) {
    // Strata's community packs pay a cold-start cost (load/compile) on their
    // first request; an explicit warm-up absorbs it before the one request
    // whose speed/quality/memory values are eligible for adoption.
    if (target.engine === "strata") await requestRun(target, "warmup");
    await requestRun(target, "adoption-target");
  }
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inputSha256: createHash("sha256")
      .update(JSON.stringify(config.messages))
      .digest("hex"),
    sampling,
    procedure: "single-request-per-engine-with-strata-warmup",
    fixtureSha256,
    ...(config.fixedTier
      ? {
          fixedTier: {
            label: config.fixedTier.label,
            totalMiB: config.fixedTier.totalMiB,
          },
        }
      : {}),
    runs,
  };
  const request = config.fixedTier
    ? remeasurementRequest(
        { ...result, execution },
        {
          execution: { runId: execution.runId, version: execution.version },
          targetCommit: provenance.targetCommit,
          runnerVersion: provenance.runnerVersion,
          fixtureSha256,
          fixedTier: config.fixedTier,
        },
        randomUUID(),
      )
    : null;
  return completeExecution(output, execution, {
    ...result,
    ...(config.fixedTier ? { remeasurementRequest: request } : {}),
  });
}
