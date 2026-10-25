import { createHash } from "node:crypto";
import {
  assertExecutionCurrent,
  beginExecution,
  completeExecution,
} from "./vendors/versioned-result.js";
import {
  engines,
  metrics,
  type Engine,
  type Execution,
} from "./domain/result.js";
import { readTargetCommit } from "./vendors/provenance.js";
import { observeStream } from "./vendors/stream.js";

/** Bump when the runner's measurement or persistence semantics change. */
export const runnerVersion = "local-inference/4";

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
  argv: readonly string[] = [
    process.execPath,
    ...process.execArgv,
    ...process.argv.slice(1),
  ],
) {
  const config = parseConfig(input);
  const provenance: Execution = {
    targetCommit: readTargetCommit(),
    commandSha256: commandFingerprint(argv),
    runnerVersion,
  };
  const execution = { ...(await beginExecution(output)), ...provenance };
  const sampling = { temperature: 0, top_p: 1, seed: 42, max_tokens: 1024 };
  const runs = [];
  for (const target of config.targets) {
    await assertExecutionCurrent(output, execution);
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
  return completeExecution(output, execution, result);
}
