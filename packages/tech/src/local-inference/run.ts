import { createHash, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { engines, metrics, type Engine } from "./domain/result.js";
import { startPeakRss } from "./vendors/peak-rss.js";
import { peakRssReading } from "./domain/peak-memory.js";
import { observeStream } from "./vendors/stream.js";

export type Config = {
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
  memorySampler = startPeakRss,
) {
  const config = parseConfig(input);
  const sampling = { temperature: 0, top_p: 1, seed: 42, max_tokens: 1024 };
  const runs = [];
  for (const target of config.targets) {
    const runId = randomUUID();
    const sampler = memorySampler(target.memoryPid);
    const started = performance.now();
    let measured;
    let status: "measured" | "failed" = "measured";
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
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      measured = metrics(await observeStream(response, started));
    } catch {
      status = "failed";
      measured = metrics({}, true);
    }
    const peakMemory = await sampler.stop();
    const reading = peakRssReading(peakMemory);
    measured.peak_rss =
      reading.value === null ? reading : { ...reading, source: "os-sampler" };
    runs.push({
      runId,
      ttft: {
        ...measured.ttft,
        reason:
          measured.ttft.value !== null
            ? "FIRST-CONTENT"
            : status === "failed"
              ? "REQUEST-FAILED"
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
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inputSha256: createHash("sha256")
      .update(JSON.stringify(config.messages))
      .digest("hex"),
    sampling,
    procedure: "single-request-per-engine",
    runs,
  };
  // Refuse to overwrite prior measurements; callers choose a new path per trial.
  await writeFile(output, JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  return result;
}
