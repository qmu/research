import type {
  CompletionClient,
  Completion,
  CompletionOptions,
  ComputerUseAction,
  ComputerUseClient,
  ComputerUseTaskInput,
  GeneratedImage,
  GeneratedSvg,
  GroundedAnswer,
  GroundedAnswerClient,
  ImageGenerationClient,
  JsonSchema,
  LlmClient,
  StreamedCompletion,
  StructuredCompletion,
  SvgGenerationClient,
  TaskAttempt,
  VisionCapability,
  VisionClient,
  VisionImageInput,
  VisionInput,
  VisionOptions,
} from "./types";
import {
  BATCHED_INFORMATION_MARKER,
  INFORMATION_ACCURACY_MANIFEST,
  batchedInformationAccuracyFixtureAnswer,
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

// A deterministic LlmClient for the insights pipeline stage on the keyless path.
// It answers with a stable, clearly-labelled stub so a keyless run is
// reproducible and never presented as a real reading. Real insights use a live
// client; this exists for tests and keyless demonstrations.
export const createFixtureInsightsClient = (model = "fixture"): LlmClient => ({
  model,
  generateAnswer: (_prompt: string): Promise<string> =>
    Promise.resolve(
      "_Fixtured insights stub — deterministic placeholder, not a real analysis._",
    ),
});

// The numeric-token forms a measurement takes; kept in sync with the domain's
// `extractNumbers` so the stub echoes exactly what the preservation check looks
// for (inlined here to avoid a vendors→domain import).
const FIXTURE_NUMBER_RE = /\d+(?:,\d+)*(?:\.\d+)?%?/g;

// A deterministic translation stub that ECHOES every number found in the prompt,
// so the domain's numeric-preservation check passes on the keyless path. It is
// clearly labelled as a stub and does not attempt real Japanese prose.
export const createFixtureTranslationClient = (
  model = "fixture",
): LlmClient => ({
  model,
  generateAnswer: (prompt: string): Promise<string> => {
    const numbers = [...new Set(prompt.match(FIXTURE_NUMBER_RE) ?? [])];
    const preserved = numbers.length > 0 ? ` 数値: ${numbers.join(", ")}` : "";
    return Promise.resolve(
      `_Fixtured 翻訳スタブ — 決定的プレースホルダ。_${preserved}`,
    );
  },
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

// Deterministic image-generation stub for the keyless path: every prompt yields
// the same committed 1x1 PNG, with a latency seeded from the prompt text so
// per-prompt latency stats are non-degenerate yet byte-stable.
export const createFixtureImageGenerationClient = (
  model = "fixture-image",
): ImageGenerationClient => ({
  model,
  generateImage: (prompt: string): Promise<GeneratedImage> => {
    const seed = [...prompt].reduce(
      (sum, char) => (sum + char.charCodeAt(0)) % 997,
      0,
    );
    return Promise.resolve({
      base64: FIXTURE_VISION_IMAGE.base64,
      mimeType: "image/png",
      elapsedMs: 5 + (seed % 45),
      model,
    });
  },
});

// Deterministic computer-use stub for the keyless path: every task yields a
// canned SUCCESSFUL trajectory whose length, per-action latency, and token usage
// are seeded from the task id, so per-task stats are non-degenerate yet
// byte-stable. It proves the scoring pipeline end to end without launching a
// browser or calling any provider — the same "perfect fixture" convention the
// image-generation judge uses (all constraints satisfied). Real, discriminating
// numbers appear only after an owner runs the real path within the cost ceiling.
export const createFixtureComputerUseClient = (
  model = "fixture-computer-use",
): ComputerUseClient => ({
  model,
  attemptTask: (task: ComputerUseTaskInput): Promise<TaskAttempt> => {
    const seed = [...`${task.id}:${task.goal}`].reduce(
      (sum, char) => (sum + char.charCodeAt(0)) % 997,
      0,
    );
    const steps = 3 + (seed % 5);
    const actions: ComputerUseAction[] = Array.from(
      { length: steps },
      (_unused, index) => ({
        kind: index === 0 ? "navigate" : index % 2 === 0 ? "type" : "click",
        target: index === 0 ? task.startUrl : `step-${index}`,
        latencyMs: 40 + ((seed + index * 7) % 60),
        recovered: false,
      }),
    );
    const inputTokens = steps * (1_500 + (seed % 200));
    const outputTokens = steps * (150 + (seed % 40));
    const wallClockMs = actions.reduce(
      (sum, action) => sum + action.latencyMs,
      0,
    );
    return Promise.resolve({
      taskId: task.id,
      succeeded: true,
      actions,
      wallClockMs,
      inputTokens,
      outputTokens,
    });
  },
});

// Canned valid SVG documents for the keyless SVG-generation path. The static
// document carries several drawable elements and a `<path>` so the complexity
// metric has signal; the animated one carries a SMIL `<animate>` so the
// animation-presence metric does too. Both are well-formed with an `<svg>` root,
// so render-validity scores 1 — the mechanical scorers run end to end without any
// API, key, or cost, the same convention as the OCR/image fixtures.
export const FIXTURE_STATIC_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect x="10" y="10" width="80" height="80" rx="8" fill="#2563eb"/>' +
  '<circle cx="50" cy="50" r="24" fill="#e11d48"/>' +
  '<path d="M20 80 L50 30 L80 80 Z" fill="none" stroke="#111111" stroke-width="3"/>' +
  "</svg>";

export const FIXTURE_ANIMATED_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<circle cx="50" cy="50" r="24" fill="#e11d48">' +
  '<animate attributeName="r" values="24;12;24" dur="2s" repeatCount="indefinite"/>' +
  "</circle></svg>";

// Deterministic SVG-generation stub for the keyless path. A prompt asking for
// animation ("animate"/"animation") yields the animated document; every other
// prompt yields the static one. Latency is seeded from the prompt text so
// per-prompt latency stats are non-degenerate yet byte-stable across runs.
export const createFixtureSvgGenerationClient = (
  model = "fixture-svg",
): SvgGenerationClient => ({
  model,
  generateSvg: (prompt: string): Promise<GeneratedSvg> => {
    const svg = /animat/i.test(prompt)
      ? FIXTURE_ANIMATED_SVG
      : FIXTURE_STATIC_SVG;
    const seed = [...prompt].reduce(
      (sum, char) => (sum + char.charCodeAt(0)) % 997,
      0,
    );
    return Promise.resolve({
      svg,
      outputTokens: Math.max(1, Math.ceil(svg.length / 4)),
      elapsedMs: 6 + (seed % 40),
      model,
    });
  },
});

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
  // Instrument-v2 batched information probe: numbered correct answers.
  if (prompt.startsWith(BATCHED_INFORMATION_MARKER)) {
    const text = batchedInformationAccuracyFixtureAnswer(
      INFORMATION_ACCURACY_MANIFEST.questions,
      seed,
    );
    return {
      text,
      outputTokens: tokensOf(text),
      elapsedMs: 14 + (seed % 5) * 2,
      model,
    };
  }
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
  // Instrument-v2 unified speed probe: an exact-length streamed generation.
  // Small seed-varying word jitter gives the length-accuracy aggregate a real
  // (reproducible) spread; ttft/per-token pacing varies with the seed too.
  const exactTarget = prompt.match(/exactly (\d+) words/)?.[1];
  if (exactTarget !== undefined) {
    const target = Number(exactTarget);
    const jitter = (seed % 3) - 1; // -1, 0, +1
    const count = Math.max(1, target + jitter);
    const text = Array.from({ length: count }, () => "word").join(" ");
    const outputTokens = tokensOf(text);
    const ttftMs = 40 + seed * 3;
    const perToken = 6 + (seed % 3);
    return {
      text,
      outputTokens,
      elapsedMs: ttftMs + outputTokens * perToken,
      ttftMs,
      model,
    };
  }
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

// Deterministic grounded-answer stub for the keyless trend-recency path. A
// `grounded` client answers with a fixed, cited sentence and one dated source, so
// citation-validity and freshness have signal; an ungrounded control returns an
// honest abstention with no citations, so the keyless run shows the exact
// grounded-vs-control contrast the topic measures — all with no API, key, or
// cost, the same convention as the SVG/OCR/image fixtures. Latency is seeded from
// the question text so per-probe latency stats are non-degenerate yet byte-stable.
export const createFixtureGroundedAnswerClient = (
  model = "fixture-grounded",
  grounded = true,
): GroundedAnswerClient => ({
  model,
  answer: (question: string): Promise<GroundedAnswer> => {
    const seed = [...question].reduce(
      (sum, char) => (sum + char.charCodeAt(0)) % 997,
      0,
    );
    const text = grounded
      ? `Based on recent reporting, here is what the sources say about the question. [1]`
      : `I don't have reliable information about very recent events beyond my training cutoff.`;
    const citations = grounded
      ? [
          {
            url: `https://news.example.com/article/${seed}`,
            publishedDateIso: "2026-01-02",
            title: "Fixture source",
          },
        ]
      : [];
    return Promise.resolve({
      answer: text,
      citations,
      outputTokens: Math.max(1, Math.ceil(text.length / 4)),
      elapsedMs: 8 + (seed % 40),
      model,
    });
  },
});
