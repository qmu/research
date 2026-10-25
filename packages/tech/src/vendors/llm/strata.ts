import { spawn } from "node:child_process";
import os from "node:os";
import type {
  Completion,
  CompletionClient,
  CompletionOptions,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
import { openAiOutputTokens } from "./usage";

// Anti-corruption layer for Strata (`Niko1221/Strata`, MIT), a local inference
// engine for Apple Silicon. Like Ollama, Strata is a long-running local server,
// not a one-shot SDK call: `strata launch --model NAME --yes --no-tui` starts
// it, after which it serves an OpenAI-compatible API. Every CLI flag, the
// server address, and the response shape read here are taken from the pinned
// primary source Niko1221/Strata @ `7dd5cf18e68c639a8773e096c5c79f971ea2a9f5`
// (`README.md`, `docs/MAC.md`, `docs/BENCHMARK_PROTOCOL.md`) — not from
// running the engine. See `docs/dependency-decisions.md` for the full citation.
//
// Unlike Ollama's adapter, which assumes the daemon is already running and
// reports a bare fetch failure when it is not, this adapter actively launches
// the server and distinguishes WHY a trial could not run: Strata's own docs
// state hard host requirements (Apple Silicon only, macOS 15 or newer) that a
// generic connection error would not explain. `captureStrataHostFingerprint`
// records the (non-secret) host facts those requirements are checked against,
// and every execution-level failure this module raises carries that
// fingerprint plus a `reasonCode` from the fixed `StrataFailureReason` union
// below, so a caller can save a structured, honest failure row instead of a
// bare error string. A content-shape problem in an otherwise successful
// response (missing text, an unfinished or tool-call result) is instead a
// plain `Error` from the shared `normalizeStrataCompletion` validator — see
// that function below for why the two are kept separate.

export const STRATA_DEFAULT_BASE_URL = "http://127.0.0.1:8080/v1";

// ── Execution environment fingerprint ────────────────────────────────────────
// Non-secret host facts Strata's own requirements (docs/MAC.md: "M1 or newer;
// macOS 15 or newer; Intel Macs cannot run it") are checked against. Captured
// through an injectable source (the shape of `node:os`'s relevant functions)
// so the check is unit-tested against any host, not only the one running CI.

export type StrataHostInfoSource = Readonly<{
  platform: () => string;
  arch: () => string;
  release: () => string;
  cpus: () => ReadonlyArray<Readonly<{ model: string }>>;
  totalmem: () => number;
}>;

const realHostInfo: StrataHostInfoSource = {
  platform: () => os.platform(),
  arch: () => os.arch(),
  release: () => os.release(),
  cpus: () => os.cpus(),
  totalmem: () => os.totalmem(),
};

export type StrataHostFingerprint = Readonly<{
  platform: string;
  arch: string;
  osRelease: string;
  cpuModel: string;
  cpuCount: number;
  totalMemoryGb: number;
}>;

export const captureStrataHostFingerprint = (
  hostInfo: StrataHostInfoSource = realHostInfo,
): StrataHostFingerprint => {
  const cpus = hostInfo.cpus();
  return {
    platform: hostInfo.platform(),
    arch: hostInfo.arch(),
    osRelease: hostInfo.release(),
    cpuModel: cpus[0]?.model ?? "unknown",
    cpuCount: cpus.length,
    totalMemoryGb: Math.round((hostInfo.totalmem() / 1024 ** 3) * 100) / 100,
  };
};

// Strata's stated minimum is macOS 15 (docs/MAC.md: "the engine uses a Metal
// residency set, introduced in macOS 15"). Node's `os.release()` reports the
// Darwin kernel version, not the macOS marketing version; the two have been a
// fixed +9 offset apart since macOS 11 Big Sur shipped as Darwin 20 — Apple's
// own kernel/marketing numbering, not a Strata-specific fact.
const DARWIN_TO_MACOS_OFFSET = 9;
const STRATA_MIN_MACOS_VERSION = 15;

const darwinMajorVersion = (release: string): number | undefined => {
  const match = release.match(/^(\d+)\./);
  return match ? Number(match[1]) : undefined;
};

export type StrataHostUnsupportedReason =
  | "unsupported-chip"
  | "unsupported-os-version";

// Pure precheck against Strata's own stated requirements. Returns `undefined`
// when the host clears them — it does NOT confirm Strata is installed or
// reachable, only that running it here is not categorically impossible.
export const classifyStrataHostFingerprint = (
  fingerprint: StrataHostFingerprint,
): StrataHostUnsupportedReason | undefined => {
  if (fingerprint.platform !== "darwin" || fingerprint.arch !== "arm64") {
    return "unsupported-chip";
  }
  const darwinMajor = darwinMajorVersion(fingerprint.osRelease);
  if (
    darwinMajor !== undefined &&
    darwinMajor - DARWIN_TO_MACOS_OFFSET < STRATA_MIN_MACOS_VERSION
  ) {
    return "unsupported-os-version";
  }
  return undefined;
};

// ── Structured failure (failure-result saving) ───────────────────────────────
// A plain `Error` carrying a machine-readable `reasonCode` and the host
// fingerprint, built with a factory rather than a subclass (this repository's
// lint policy bans `class`). `isStrataFailure` narrows a caught `unknown` back
// to it so a runner can save a structured row — reason code, fingerprint,
// message — rather than a bare string, matching this directory's existing rule
// that a failed trial is recorded honestly, never papered over with a
// fabricated measurement.

// The last two codes apply only to `completeStreaming`'s own direct SSE
// parsing, which has no equivalent shared validator to delegate to: the
// non-streamed path's content-shape failures go through
// `normalizeStrataCompletion` as a plain `Error` instead (see below).
export type StrataFailureReason =
  | StrataHostUnsupportedReason
  | "cli-not-found"
  | "launch-timeout"
  | "http-error"
  | "incomplete-response"
  | "tool-call-unsupported";

export type StrataFailure = Error &
  Readonly<{
    reasonCode: StrataFailureReason;
    fingerprint: StrataHostFingerprint;
  }>;

export const createStrataFailure = (
  reasonCode: StrataFailureReason,
  message: string,
  fingerprint: StrataHostFingerprint,
): StrataFailure =>
  Object.assign(new Error(message), { reasonCode, fingerprint });

export const isStrataFailure = (error: unknown): error is StrataFailure =>
  error instanceof Error && "reasonCode" in error;

// ── Launching the server ──────────────────────────────────────────────────
// The official CLI's control surface for starting the server (README.md /
// docs/MAC.md): `strata launch [--model NAME --yes --no-tui]`. `--yes` skips
// the interactive first-run confirmation (model download size, disk use);
// `--no-tui` keeps stdout script-friendly instead of the terminal UI
// `strata monitor` drives.

export type StrataLaunchInvocation = Readonly<{ model: string }>;

export const buildStrataLaunchArgs = (
  invocation: StrataLaunchInvocation,
): ReadonlyArray<string> => [
  "launch",
  "--model",
  invocation.model,
  "--yes",
  "--no-tui",
];

export type StrataLauncher = (
  invocation: StrataLaunchInvocation,
) => Promise<void>;

// `strata launch` runs the server in the foreground for as long as it serves
// traffic — the same shape as `ollama serve` — so this spawns it detached and
// resolves once the process itself has started, not once the model has
// finished loading. `callWithRetry` below is what waits out the load time, by
// retrying the real request until the server accepts it.
export const spawnStrataLaunch: StrataLauncher = (invocation) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("strata", [...buildStrataLaunchArgs(invocation)], {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });

// ── Talking to the running server ────────────────────────────────────────────
// Reached with the runtime's built-in `fetch`, the same choice `ollama.ts`
// makes: the whole surface used here is a couple of JSON POSTs against the
// OpenAI-compatible `/v1/chat/completions` Strata's README states it serves at
// `127.0.0.1:8080/v1` — no SDK dependency for a protocol this small. A single
// `StrataHttpTransport` seam covers both the one-shot and the streamed call;
// `lines()` is only read in the streamed path.

export type StrataHttpResponse = Readonly<{
  status: number;
  json: () => Promise<unknown>;
  lines: () => AsyncIterable<string>;
}>;

export type StrataHttpTransport = (
  url: string,
  init: Readonly<{
    method: string;
    headers: Readonly<Record<string, string>>;
    body?: string;
  }>,
) => Promise<StrataHttpResponse>;

// Strata's streamed chat answers are Server-Sent Events, the same framing
// OpenAI's Chat Completions streaming uses (consistent with Strata's own
// "OpenAI-compatible" claim): lines of `data: <json>`, ending with `data:
// [DONE]`. Buffered and decoded here so the public seam only has to produce
// already-decoded `data:` payloads, in or out of a test.
async function* readSseDataLines(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string> {
  if (body === null) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.startsWith("data:")) {
        const data = line.slice("data:".length).trim();
        if (data !== "") yield data;
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }
}

const realTransport: StrataHttpTransport = async (url, init) => {
  const response = await fetch(url, init);
  return {
    status: response.status,
    json: () => response.json(),
    lines: () => readSseDataLines(response.body),
  };
};

// No portable reasoning-effort knob is documented for Strata's served model
// (Qwen3.8-Flash-Next, a mixture-of-experts model with no effort parameter
// named in the read sources), so — the same honest omission `ollama.ts` makes
// — `options.effort` is not mapped here.
const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, " +
  "explanation, or commentary.";

export const buildStrataChatBody = (
  model: string,
  prompt: string,
  options: CompletionOptions | undefined,
  stream: boolean,
): Record<string, unknown> => ({
  model,
  stream,
  max_tokens: options?.maxTokens ?? 2048,
  messages: [
    { role: "system", content: SYSTEM_FINAL_ANSWER_ONLY },
    { role: "user", content: prompt },
  ],
});

// The wire shape of one non-streamed `/v1/chat/completions` response — the
// standard OpenAI Chat Completions fields Strata's README states this
// endpoint serves, `finish_reason` included.
export type StrataChatResponse = Readonly<{
  choices?: ReadonlyArray<
    Readonly<{
      message?: Readonly<{ content?: unknown }>;
      finish_reason?: unknown;
    }>
  >;
  usage?: Readonly<{ completion_tokens?: unknown }>;
}>;

// One streamed chunk's shape; the final chunk carries `usage` in place of a
// `delta` (docs/BENCHMARK_PROTOCOL.md: "Streaming chat answers end with a
// chunk carrying `usage` and `timings`").
export type StrataChatStreamChunk = Readonly<{
  choices?: ReadonlyArray<
    Readonly<{
      delta?: Readonly<{
        content?: unknown;
        tool_calls?: ReadonlyArray<unknown>;
      }>;
    }>
  >;
  usage?: Readonly<{ completion_tokens?: unknown }>;
}>;

// ── Importing a measured trial (qmu/research#188's bench-record shape) ──────
// Niko1221/Strata's own benchmark tool (`strata_cli/bench_standard.py`'s
// `record_of`, per docs/BENCHMARK_PROTOCOL.md) does not write a bare chat
// response to `outputs.jsonl` — it wraps the engine's `final_answer` /
// `finish_reason` / `usage` with the CLIENT's own observations: whether the
// request itself succeeded (`error`, `http_status`) and the client's own
// wall-clock dispatch/end offsets (`dispatch_offset_s`, `end_offset_s`) —
// never the engine's internal `timings`, which measure the server's prompt
// and decode phases, not the client's request. `normalizeStrataCompletion`
// below validates and imports exactly that record shape, so a trial this
// adapter measures live and a line replayed from a saved `outputs.jsonl` both
// produce the same `Completion` through the same, one, validated path.
//
// qmu/research#188 (open at the time this branch was cut from `origin/main`,
// which does not yet carry it) adds a function of this same name for the
// saved-recording replay case, with the identical field names and validation
// rules reproduced here — both independently derived from the same pinned
// primary source. If #188 merges first, this definition is the one to delete,
// importing its `normalizeStrataCompletion` instead.
export type StrataBenchRecord = Readonly<{
  final_answer: unknown;
  finish_reason: unknown;
  usage: unknown;
  error: unknown;
  http_status: unknown;
  dispatch_offset_s: unknown;
  end_offset_s: unknown;
}>;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid Strata result: expected an object");
  }
  return value as Record<string, unknown>;
};

const nonnegative = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Invalid Strata result: ${field} must be a finite nonnegative number`,
    );
  }
  return value;
};

export const normalizeStrataCompletion = (
  input: unknown,
  model: string,
): Completion => {
  const result = asRecord(input);
  if (typeof model !== "string" || model.trim().length === 0) {
    throw new Error("Invalid Strata result: model provenance is required");
  }
  if (result.error !== null || result.http_status !== 200) {
    // Do not echo upstream errors, which can include credentials or hostnames.
    throw new Error("Invalid Strata result: failed or missing request status");
  }
  if (result.finish_reason !== "stop" && result.finish_reason !== "length") {
    throw new Error(
      "Invalid Strata result: expected a finished text completion",
    );
  }
  if (typeof result.final_answer !== "string") {
    throw new Error("Invalid Strata result: final_answer must be a string");
  }
  const outputTokens = nonnegative(
    asRecord(result.usage).completion_tokens,
    "usage.completion_tokens",
  );
  if (!Number.isSafeInteger(outputTokens)) {
    throw new Error(
      "Invalid Strata result: completion_tokens must be a safe integer",
    );
  }
  const start = nonnegative(result.dispatch_offset_s, "dispatch_offset_s");
  const end = nonnegative(result.end_offset_s, "end_offset_s");
  // Client end-to-end time only; engine prompt/decode timings are not a
  // substitute for it.
  const elapsedMs = nonnegative((end - start) * 1000, "elapsedMs");
  return { text: result.final_answer, outputTokens, elapsedMs, model };
};

// Builds one bench record (dispatch always 0 — each call measures its own
// single request, never a multi-request session) from a freshly received,
// already-successful (`status < 400`) chat-completions response, so a live
// measurement validates through the exact same `normalizeStrataCompletion`
// path as a saved recording — a tool-call or unfinished response is rejected
// there (`finish_reason` is neither `"stop"` nor `"length"`), not here.
export const strataBenchRecordFromChatResponse = (
  raw: StrataChatResponse,
  httpStatus: number,
  endOffsetSeconds: number,
): StrataBenchRecord => {
  const choice = raw.choices?.[0];
  return {
    final_answer: choice?.message?.content,
    finish_reason: choice?.finish_reason,
    usage: raw.usage,
    error: null,
    http_status: httpStatus,
    dispatch_offset_s: 0,
    end_offset_s: endOffsetSeconds,
  };
};

// ── The CompletionClient ──────────────────────────────────────────────────

const DEFAULT_LAUNCH_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 500;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const errorCauseCode = (error: Error): string | undefined => {
  const cause = error.cause as Readonly<{ code?: string }> | undefined;
  return cause?.code;
};

const isConnectionRefused = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    errorCauseCode(error) === "ECONNREFUSED" ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("fetch failed")
  );
};

export type StrataCompletionClientOptions = Readonly<{
  baseUrl?: string;
  launch?: StrataLauncher;
  transport?: StrataHttpTransport;
  hostInfo?: StrataHostInfoSource;
  launchTimeoutMs?: number;
  pollIntervalMs?: number;
  clock?: () => number;
  sleep?: (ms: number) => Promise<void>;
}>;

// Connects the official CLI + local HTTP server to this directory's shared
// `CompletionClient` port, the same contract `createOllamaCompletionClient` /
// `createMlxCliCompletionClient` / the cloud adapters implement — so a
// benchmark entrypoint written against the port reaches Strata exactly the way
// it reaches any other provider, with no provider branch.
export const createStrataCompletionClient = (
  model: string,
  options?: StrataCompletionClientOptions,
): CompletionClient => {
  const baseUrl = options?.baseUrl ?? STRATA_DEFAULT_BASE_URL;
  const launch = options?.launch ?? spawnStrataLaunch;
  const transport = options?.transport ?? realTransport;
  const hostInfo = options?.hostInfo ?? realHostInfo;
  const launchTimeoutMs = options?.launchTimeoutMs ?? DEFAULT_LAUNCH_TIMEOUT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const clock = options?.clock ?? Date.now;
  const sleep = options?.sleep ?? defaultSleep;

  const fingerprint = captureStrataHostFingerprint(hostInfo);
  let launched = false;

  // Checked once per client (the host does not change mid-run), and before
  // ever shelling out: a host Strata's own docs say cannot run it should never
  // be reported as "binary not found" or "connection refused" — those would be
  // true but misleading explanations for a categorical mismatch.
  const ensureReady = async (): Promise<void> => {
    const unsupported = classifyStrataHostFingerprint(fingerprint);
    if (unsupported !== undefined) {
      throw createStrataFailure(
        unsupported,
        `Strata does not support this host (${unsupported}): ` +
          `${fingerprint.platform}/${fingerprint.arch}, ` +
          `Darwin ${fingerprint.osRelease}`,
        fingerprint,
      );
    }
    if (launched) return;
    try {
      await launch({ model });
    } catch (error) {
      throw createStrataFailure(
        "cli-not-found",
        `could not launch the strata CLI: ${String(error)}`,
        fingerprint,
      );
    }
    launched = true;
  };

  // The model can take well past the request timeout to finish loading, so a
  // connection-refused attempt is retried (not failed) until `launchTimeoutMs`
  // elapses. Any other failure — a `StrataFailure` already classified above,
  // or a plain `Error` from `normalizeStrataCompletion` — is not a connection
  // problem and propagates on the first attempt, unwrapped: only "the server
  // isn't up yet" is worth waiting out or reclassifying.
  const callWithRetry = async <T>(attempt: () => Promise<T>): Promise<T> => {
    const deadline = clock() + launchTimeoutMs;
    for (;;) {
      try {
        return await attempt();
      } catch (error) {
        if (!isConnectionRefused(error)) throw error;
        if (clock() >= deadline) {
          throw createStrataFailure(
            "launch-timeout",
            `Strata server at ${baseUrl} never accepted a connection within ` +
              `${launchTimeoutMs}ms: ${String(error)}`,
            fingerprint,
          );
        }
        await sleep(pollIntervalMs);
      }
    }
  };

  const chatCompletion = (
    prompt: string,
    completionOptions: CompletionOptions | undefined,
    stream: boolean,
  ): Promise<StrataHttpResponse> =>
    transport(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildStrataChatBody(model, prompt, completionOptions, stream),
      ),
    });

  return {
    model,
    complete: async (prompt, completionOptions) => {
      await ensureReady();
      return callWithRetry(async () => {
        const startedAt = clock();
        const response = await chatCompletion(prompt, completionOptions, false);
        if (response.status >= 400) {
          throw createStrataFailure(
            "http-error",
            `Strata chat completion failed: HTTP ${response.status}`,
            fingerprint,
          );
        }
        const raw = (await response.json()) as StrataChatResponse;
        const record = strataBenchRecordFromChatResponse(
          raw,
          response.status,
          (clock() - startedAt) / 1000,
        );
        // A malformed or unfinished (e.g. tool-call) record throws a plain
        // `Error` from `normalizeStrataCompletion` — a content-shape problem,
        // not an execution-environment one, so it is not wrapped as a
        // `StrataFailure`. `isStrataFailure` only ever recognizes the
        // execution-level reasons this module itself raises.
        return normalizeStrataCompletion(record, model);
      });
    },
    completeStreaming: async (
      prompt,
      completionOptions,
    ): Promise<StreamedCompletion> => {
      await ensureReady();
      return callWithRetry(async () => {
        const startedAt = clock();
        const response = await chatCompletion(prompt, completionOptions, true);
        if (response.status >= 400) {
          throw createStrataFailure(
            "http-error",
            `Strata chat completion failed: HTTP ${response.status}`,
            fingerprint,
          );
        }
        let ttftMs: number | null = null;
        let text = "";
        let outputTokens = 0;
        let sawAny = false;
        for await (const data of response.lines()) {
          if (data === "[DONE]") break;
          const chunk = JSON.parse(data) as StrataChatStreamChunk;
          const delta = chunk.choices?.[0]?.delta;
          if ((delta?.tool_calls?.length ?? 0) > 0) {
            throw createStrataFailure(
              "tool-call-unsupported",
              "Strata streamed a tool call; this adapter normalizes text " +
                "completions only",
              fingerprint,
            );
          }
          const piece = typeof delta?.content === "string" ? delta.content : "";
          if (piece !== "") {
            if (ttftMs === null) ttftMs = clock() - startedAt;
            text += piece;
            sawAny = true;
          }
          if (chunk.usage !== undefined) {
            outputTokens = openAiOutputTokens(chunk.usage);
            sawAny = true;
          }
        }
        if (!sawAny) {
          throw createStrataFailure(
            "incomplete-response",
            "Strata's stream ended with no content and no usage",
            fingerprint,
          );
        }
        return {
          text,
          outputTokens,
          elapsedMs: clock() - startedAt,
          ttftMs,
          model,
        };
      });
    },
    // The read primary sources (README.md, docs/MAC.md,
    // docs/BENCHMARK_PROTOCOL.md) document no JSON-schema-constrained output
    // feature. Rejecting — rather than best-effort JSON-parsing free text —
    // matches `mlx.ts`'s rule: a capability a provider does not document is a
    // failed call, never a silent approximation.
    completeStructured: async (): Promise<StructuredCompletion> => {
      throw new Error(
        "Strata adapter has no structured-output mode: the read primary " +
          "sources document no JSON-schema-constrained output feature",
      );
    },
  };
};
