import type {
  Completion,
  CompletionClient,
  CompletionOptions,
  JsonSchema,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
import { ollamaOutputTokens } from "./usage";

// Ollama serves a local REST API (http://localhost:11434 by default); no SDK
// is published for this repo's stack, and the whole surface here is a couple
// of JSON POSTs, so this adapter reaches it with the runtime's built-in
// `fetch` — no new dependency (see docs/dependency-decisions.md). Unlike
// every other adapter in this directory, Ollama needs no bearer credential:
// the keyless case is "the local daemon isn't running", not "no API key", so
// this port has no entry in `credentials.ts` and the entrypoint wiring is a
// follow-up once a real run is scheduled.
export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";

const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

// The wire shape of one /api/generate line, streamed or not: the SAME object
// shape is the whole non-streamed response and the final (`done: true`) line
// of a streamed one. Field names are Ollama's own
// (https://github.com/ollama/ollama/blob/main/docs/api.md): `response` is the
// generated text for this line, and `eval_count` — normalized through
// `ollamaOutputTokens`, the same pattern every other provider's
// differently-named usage field goes through in `usage.ts` — is the
// cumulative output-token count, present only once `done` is true.
export type OllamaGenerateResponse = Readonly<{
  model?: unknown;
  response?: unknown;
  done?: unknown;
  eval_count?: unknown;
}>;

// Normalize one non-streamed /api/generate response into the provider-neutral
// `Completion`. Pure — no network, no Date.now() — so it is unit-tested
// directly against a captured response fixture. `elapsedMs` is supplied by
// the caller (measured around the fetch), matching every other adapter's
// convention of its own wall-clock measurement rather than a
// provider-reported duration (Ollama also reports `total_duration` in
// nanoseconds, but using it instead would make this adapter the one provider
// whose latency is self-reported rather than measured, which would corrupt a
// cross-provider latency comparison).
export const normalizeOllamaCompletion = (
  raw: OllamaGenerateResponse,
  apiModelId: string,
  elapsedMs: number,
): Completion => ({
  text: typeof raw.response === "string" ? raw.response : "",
  outputTokens: ollamaOutputTokens(raw),
  elapsedMs,
  model: apiModelId,
});

// Ollama has no single portable reasoning-effort knob across models (the
// thinking-capable ones take a boolean `think`, not a leveled effort), so
// `options.effort` is deliberately not mapped here — the same honest omission
// the registry marks `n/a` for a model with no effort knob elsewhere.
// `maxTokens` maps to Ollama's `num_predict` generation option.
const buildOllamaGenerateBody = (
  model: string,
  prompt: string,
  options: CompletionOptions | undefined,
  stream: boolean,
): Record<string, unknown> => ({
  model,
  prompt,
  system: SYSTEM_FINAL_ANSWER_ONLY,
  stream,
  options: { num_predict: options?.maxTokens ?? 2048 },
});

const postJson = async (
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `ollama ${path} failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
};

// Ollama's streamed /api/generate emits newline-delimited JSON objects (NDJSON),
// one per generated chunk, ending with a `done: true` line that carries the
// final usage counts. Parsed from a `ReadableStream<Uint8Array>` with an
// explicit reader loop (rather than `for await` over the stream) because
// `Response.body`'s native async-iteration support is not guaranteed across
// every runtime this adapter may run under.
const readNdjsonLines = async (
  body: ReadableStream<Uint8Array>,
  onLine: (line: OllamaGenerateResponse) => void,
): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim() !== "") {
        onLine(JSON.parse(line) as OllamaGenerateResponse);
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }
  if (buffer.trim() !== "") {
    onLine(JSON.parse(buffer) as OllamaGenerateResponse);
  }
};

export const createOllamaCompletionClient = (
  apiModelId: string,
  baseUrl: string = OLLAMA_DEFAULT_BASE_URL,
): CompletionClient => ({
  model: apiModelId,
  complete: async (prompt, options) => {
    const startedAt = Date.now();
    const raw = (await postJson(
      baseUrl,
      "/api/generate",
      buildOllamaGenerateBody(apiModelId, prompt, options, false),
    )) as OllamaGenerateResponse;
    return normalizeOllamaCompletion(raw, apiModelId, Date.now() - startedAt);
  },
  completeStreaming: async (prompt, options): Promise<StreamedCompletion> => {
    const startedAt = Date.now();
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildOllamaGenerateBody(apiModelId, prompt, options, true),
      ),
    });
    if (!response.ok || response.body === null) {
      throw new Error(
        `ollama /api/generate failed: ${response.status} ${response.statusText}`,
      );
    }
    let ttftMs: number | null = null;
    let text = "";
    let outputTokens = 0;
    await readNdjsonLines(response.body, (line) => {
      const piece = typeof line.response === "string" ? line.response : "";
      if (piece !== "") {
        if (ttftMs === null) ttftMs = Date.now() - startedAt;
        text += piece;
      }
      if (line.done === true) outputTokens = ollamaOutputTokens(line);
    });
    return {
      text,
      outputTokens,
      elapsedMs: Date.now() - startedAt,
      ttftMs,
      model: apiModelId,
    };
  },
  completeStructured: async (
    prompt,
    schema: JsonSchema,
    options,
  ): Promise<StructuredCompletion> => {
    const startedAt = Date.now();
    // Ollama's structured-output feature (0.5+) takes the JSON Schema directly
    // under `format`, unlike OpenAI/Google's nested `{ type, schema }` wrapper.
    const raw = (await postJson(baseUrl, "/api/generate", {
      ...buildOllamaGenerateBody(apiModelId, prompt, options, false),
      format: schema,
    })) as OllamaGenerateResponse;
    return {
      raw: typeof raw.response === "string" ? raw.response : "",
      outputTokens: ollamaOutputTokens(raw),
      elapsedMs: Date.now() - startedAt,
      model: apiModelId,
    };
  },
});
