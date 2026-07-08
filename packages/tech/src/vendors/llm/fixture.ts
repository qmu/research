import type {
  CompletionClient,
  Completion,
  CompletionOptions,
  JsonSchema,
  LlmClient,
  StreamedCompletion,
  StructuredCompletion,
  VisionCapability,
  VisionClient,
  VisionImageInput,
  VisionInput,
  VisionOptions,
} from "./types";
import {
  INFORMATION_ACCURACY_MANIFEST,
  informationAccuracyFixtureAnswer,
} from "../../llm-model-comparison/domain/information-accuracy";

// A deterministic client that returns canned answers keyed by prompt. It calls
// no API, so it runs in CI without credentials or cost. Used for the pipeline
// self-test and for unit tests. (Seed benchmark contract — untouched.)
export const createFixtureClient = (
  answers: ReadonlyMap<string, string>,
): LlmClient => ({
  model: "fixture",
  generateAnswer: (prompt: string): Promise<string> =>
    Promise.resolve(answers.get(prompt) ?? ""),
});

// A deterministic CompletionClient for the comparison pipeline's keyless path.
//
// It is a pure function of (prompt, schema, seed): the SAME seed reproduces
// byte-identical output, and DIFFERENT seeds vary the output in a small, bounded
// way. The runner passes the trial index as the seed, so a multi-trial fixture
// run produces a real (non-degenerate) yet perfectly reproducible distribution —
// exercising throughput/latency/schema/length aggregation, and the judge, without
// any API, key, or cost. Every configuration built from this client is flagged
// `fixtured`, so these numbers are never presented as live.
export const createFixtureCompletionClient = (
  model = "fixture",
  seed = 0,
): CompletionClient => ({
  model,
  complete: (
    prompt: string,
    _options?: CompletionOptions,
  ): Promise<Completion> => Promise.resolve(buildComplete(prompt, model, seed)),
  completeStreaming: (
    prompt: string,
    _options?: CompletionOptions,
  ): Promise<StreamedCompletion> =>
    Promise.resolve(buildStreamed(prompt, model, seed)),
  completeStructured: (
    _prompt: string,
    schema: JsonSchema,
    _options?: CompletionOptions,
  ): Promise<StructuredCompletion> =>
    Promise.resolve(buildStructured(schema, model, seed)),
});

export const FIXTURE_VISION_IMAGE: VisionImageInput = {
  // A committed 1x1 transparent PNG, encoded once and kept inline so the keyless
  // path does not depend on filesystem reads or image codecs.
  base64:
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lK3Q6wAAAABJRU5ErkJggg==",
  mimeType: "image/png",
  pageNumber: 1,
  label: "fixture-1x1-transparent-png",
};

export const FIXTURE_VISION_INSTRUCTION = "Describe the fixture image.";

const FIXTURE_VISION_TEXT =
  "Fixture vision response: one transparent 1x1 PNG page.";

export const FIXTURE_VISION_CAPABILITY: VisionCapability = {
  imageInput: true,
  structuredOutput: true,
  supportedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
};

export const createFixtureVisionClient = (
  model = "fixture-vision",
): VisionClient => ({
  model,
  capability: FIXTURE_VISION_CAPABILITY,
  completeVision: (
    input: VisionInput,
    _options?: VisionOptions,
  ): Promise<Completion> =>
    Promise.resolve({
      text: visionTextFor(input),
      outputTokens: tokensOf(visionTextFor(input)),
      elapsedMs: 9,
      model,
    }),
  completeVisionStructured: (
    _input: VisionInput,
    schema: JsonSchema,
    _options?: VisionOptions,
  ): Promise<StructuredCompletion> =>
    Promise.resolve(buildStructured(schema, model, 0)),
});

const wordCountFor = (
  regex: RegExp,
  prompt: string,
  fallback: number,
): number => {
  const m = prompt.match(regex);
  return m ? Number(m[1]) : fallback;
};

const tokensOf = (text: string): number =>
  Math.max(1, Math.ceil(text.length / 4));

const isFixtureVisionInput = (input: VisionInput): boolean =>
  input.instruction === FIXTURE_VISION_INSTRUCTION &&
  input.images.length === 1 &&
  input.images[0]?.base64 === FIXTURE_VISION_IMAGE.base64 &&
  input.images[0]?.mimeType === FIXTURE_VISION_IMAGE.mimeType;

const visionTextFor = (input: VisionInput): string =>
  isFixtureVisionInput(input)
    ? FIXTURE_VISION_TEXT
    : `Fixture vision response: ${input.images.length} image(s), ${input.instruction.length} instruction character(s).`;

// --- text completion (the length probe uses this non-streamed path) -----------

const buildComplete = (
  prompt: string,
  model: string,
  seed: number,
): Completion => {
  const informationQuestionId = prompt.match(/Question ID: ([^\n]+)/)?.[1];
  const informationItem = INFORMATION_ACCURACY_MANIFEST.questions.find(
    (item) => item.id === informationQuestionId,
  );
  if (informationItem !== undefined) {
    const text = informationAccuracyFixtureAnswer(informationItem, seed);
    return {
      text,
      outputTokens: tokensOf(text),
      elapsedMs: 10 + (seed % 5) * 2,
      model,
    };
  }
  const target = wordCountFor(/exactly (\d+) words/, prompt, 100);
  const jitter = (seed % 3) - 1; // -1, 0, +1 — small reproducible spread
  const count = Math.max(1, target + jitter);
  const text = Array.from({ length: count }, () => "word").join(" ");
  return {
    text,
    outputTokens: tokensOf(text),
    elapsedMs: 12 + (seed % 5) * 2,
    model,
  };
};

// --- streamed completion (throughput + latency probes) ------------------------

const buildStreamed = (
  prompt: string,
  model: string,
  seed: number,
): StreamedCompletion => {
  const isThroughput = /at least (\d+) words/.test(prompt);
  if (isThroughput) {
    const target = wordCountFor(/at least (\d+) words/, prompt, 400);
    const text = Array.from({ length: target }, () => "word").join(" ");
    const outputTokens = tokensOf(text);
    const ttftMs = 40 + seed * 3;
    const perToken = 6 + (seed % 3); // ~143–167 tok/s, seed-varying
    return {
      text,
      outputTokens,
      elapsedMs: ttftMs + outputTokens * perToken,
      ttftMs,
      model,
    };
  }
  // Latency probe: a short response; the numbers are about responsiveness.
  const text = `A concise fixtured fact number ${seed}.`;
  const outputTokens = tokensOf(text);
  const ttftMs = 30 + seed * 5;
  return {
    text,
    outputTokens,
    elapsedMs: ttftMs + 20 + seed * 2,
    ttftMs,
    model,
  };
};

// --- structured output (schema-escalation probe + the judge review) -----------

// Total scalar (leaf) count of a generated schema — a proxy for its complexity,
// used to decide how far up the escalation ladder this fixture "affords" before
// it stops returning conforming output.
const scalarCount = (schema: Record<string, unknown>): number => {
  if (schema.type === "object") {
    const props = (schema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    return Object.values(props).reduce((sum, s) => sum + scalarCount(s), 0);
  }
  return 1;
};

// Build a value that conforms to the given schema. String leaves get a
// deterministic, seed-varying value; nested objects recurse. This same builder
// produces both a conforming schema-probe instance and a well-formed judge review
// (whose schema is three string fields), so the fixture judge is deterministic.
const buildInstance = (
  schema: Record<string, unknown>,
  seed: number,
): unknown => {
  if (schema.type === "object") {
    const props = (schema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const required = (schema.required ?? []) as ReadonlyArray<string>;
    const out: Record<string, unknown> = {};
    for (const key of required) {
      out[key] = buildInstance(props[key], seed);
    }
    return out;
  }
  if (schema.type === "integer") return seed;
  if (schema.type === "number") return seed;
  if (schema.type === "boolean") return seed % 2 === 0;
  return `fixtured value ${seed}`; // string leaf
};

const buildStructured = (
  schema: JsonSchema,
  model: string,
  seed: number,
): StructuredCompletion => {
  const s = schema as Record<string, unknown>;
  const size = scalarCount(s);
  // Seed-varying complexity cap so max-schema-complexity has a real spread across
  // trials. The review schema (3 fields) is always under the cap, so the fixture
  // judge always returns a well-formed review.
  const cap = 8 + (seed % 3) * 6; // 8, 14, or 20
  const raw = size <= cap ? JSON.stringify(buildInstance(s, seed)) : "{}"; // beyond the cap: valid JSON that does not conform (missing keys)
  return {
    raw,
    outputTokens: tokensOf(raw),
    elapsedMs: 15 + seed * 3 + size,
    model,
  };
};
