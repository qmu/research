import { createHash } from "node:crypto";
import { writeJsonAtomic } from "./vendors/atomic-json.js";
import { engines, metrics, type Engine } from "./domain/result.js";
import { observeStream } from "./vendors/stream.js";

export type Config = {
  messages: { role: "system" | "user"; content: string }[];
  targets: {
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
) {
  const config = parseConfig(input);
  const sampling = { temperature: 0, top_p: 1, seed: 42, max_tokens: 1024 };
  const runs = [];
  for (const target of config.targets) {
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
    runs.push({
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
  await writeJsonAtomic(output, result);
  return result;
}
