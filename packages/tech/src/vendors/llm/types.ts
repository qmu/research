// Anti-corruption layer contract for large language model providers. The domain
// depends only on this shape, never on a provider SDK — so a model can be
// swapped without touching benchmark logic.

import type { EffortLevel } from "../../llm-model-comparison/domain/effort";

export type LlmClient = Readonly<{
  model: string;
  generateAnswer: (prompt: string) => Promise<string>;
}>;

// A richer contract for the model-comparison topic, which needs token counts and
// timing that `generateAnswer` discards. Added alongside `LlmClient` (not a
// widening of it) so the seed benchmark's contract and tests are untouched and
// each topic depends only on the contract it needs.

// Provider-neutral completion options.
//
//  - `topic` is passed through for probes that need a subject.
//  - `effort` is a provider-neutral effort/reasoning label (e.g. "low", "high",
//    "max", "n/a"). Each adapter maps it to that provider's own knob
//    (OpenAI `reasoning_effort`, Anthropic `output_config.effort`, Google
//    thinking budget); a value a model does not support is surfaced as a failed
//    call, never silently dropped.
//
// No provider-specific field appears here.
export type CompletionOptions = Readonly<{
  maxTokens?: number;
  topic?: string;
  effort?: EffortLevel;
}>;

// The normalized result of one completion. The adapter measures `elapsedMs`
// around its own SDK call and normalizes each provider's differently-named
// output-token count into `outputTokens`, so the domain never branches on
// provider.
export type Completion = Readonly<{
  text: string;
  outputTokens: number;
  elapsedMs: number;
  model: string;
}>;

// A completion measured over a *streamed* response, so the moment the first
// token arrived is captured. `ttftMs` is time-to-first-token (from request start
// to the first content delta); `elapsedMs` is the total wall-clock to the last
// token. Sustained generation throughput is derived from these by the domain
// (tokens over the generation window, `elapsedMs - ttftMs`), and latency is
// reported as `ttftMs` + total separately — the two are no longer conflated.
export type StreamedCompletion = Completion &
  Readonly<{
    ttftMs: number;
  }>;

// A provider-neutral JSON Schema. The domain builds these (see
// `domain/json-schema.ts`); each adapter translates one into that provider's
// structured-output feature. Kept structural — an opaque readonly record — so no
// provider's schema type leaks into the domain.
export type JsonSchema = Readonly<Record<string, unknown>>;

// The result of a structured-output call: the provider was asked to return JSON
// conforming to a schema, and this is the raw text it produced plus usage. The
// adapter does NOT grade conformance — that is a pure domain concern
// (`gradeConformance` in `domain/json-schema.ts`), so the grader stays
// unit-testable and the same rule applies to every provider. `raw` is preserved
// verbatim for the run-artifact.
export type StructuredCompletion = Readonly<{
  raw: string;
  outputTokens: number;
  elapsedMs: number;
  model: string;
}>;

// Provider-neutral image input for vision-capable models. Images are passed as
// base64 bytes plus a MIME type; adapters translate this into each provider's
// content-block shape. A request carries one text instruction and one or more
// images/pages so OCR-style callers can keep page ordering without leaking SDK
// types into the domain/vendors boundary.
export type VisionMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

export type VisionImageInput = Readonly<{
  base64: string;
  mimeType: VisionMimeType;
  pageNumber?: number;
  label?: string;
}>;

export type VisionInput = Readonly<{
  instruction: string;
  images: ReadonlyArray<VisionImageInput>;
}>;

export type VisionCapability = Readonly<{
  imageInput: true;
  structuredOutput: boolean;
  supportedMimeTypes: ReadonlyArray<VisionMimeType>;
}>;

export type VisionOptions = CompletionOptions;

// The richer completion port for the comparison topic. Three capabilities beyond
// a plain text completion, all provider-neutral:
//
//  - `complete` — a one-shot text completion (kept for the length probe and any
//    non-streamed use).
//  - `completeStreaming` — a streamed completion that additionally reports
//    time-to-first-token, so throughput and latency can be measured separately.
//  - `completeStructured` — a completion driven through the provider's dedicated
//    structured-output / JSON-schema feature, returning the raw JSON text for
//    the domain to conformance-grade.
//
// Each method takes the same provider-neutral options (including `effort`).
export type CompletionClient = Readonly<{
  model: string;
  complete: (
    prompt: string,
    options?: CompletionOptions,
  ) => Promise<Completion>;
  completeStreaming: (
    prompt: string,
    options?: CompletionOptions,
  ) => Promise<StreamedCompletion>;
  completeStructured: (
    prompt: string,
    schema: JsonSchema,
    options?: CompletionOptions,
  ) => Promise<StructuredCompletion>;
}>;

// One generated image, normalized across providers: base64 bytes + MIME type,
// with the wall-clock the adapter measured around its own SDK call. Bytes stay
// in memory for judging and hashing; they are never committed to the repo.
export type GeneratedImage = Readonly<{
  base64: string;
  mimeType: VisionMimeType;
  elapsedMs: number;
  model: string;
}>;

// The image-generation port. Deliberately minimal (one prompt in, one image
// out) so every provider's differently-shaped image API normalizes to the same
// contract and the benchmark domain never branches on provider.
export type ImageGenerationClient = Readonly<{
  model: string;
  generateImage: (prompt: string) => Promise<GeneratedImage>;
}>;

// One generated SVG document, normalized across providers: the SVG source the
// model emitted (already unwrapped from any Markdown fences / prose by the
// adapter), plus the output-token count and the wall-clock the adapter measured.
// SVG is text, so — unlike raster images — the bytes are cheap to keep, score
// mechanically, and even commit as fixtures.
export type GeneratedSvg = Readonly<{
  svg: string;
  outputTokens: number;
  elapsedMs: number;
  model: string;
}>;

// One source a grounded answer cited, normalized across providers. Field names
// mirror the trend-recency domain's `Citation` so a returned array flows straight
// through without a mapping step, while this port stays free of any domain import
// (the same self-contained convention as `GeneratedSvg`). `publishedDateIso`
// drives the freshness metric and is absent when a surface returns bare URLs.
export type GroundedCitation = Readonly<{
  url: string;
  publishedDateIso?: string;
  title?: string;
}>;

// One grounded answer: the model's text plus the sources it cited, with the
// output-token count and the wall-clock the adapter measured. Perplexity Sonar
// returns citations natively; a plain completion adapter fills `citations` from
// URLs found in the prose. Kept distinct from `Completion` so ungrounded text
// probes keep their existing contract.
export type GroundedAnswer = Readonly<{
  answer: string;
  citations: ReadonlyArray<GroundedCitation>;
  outputTokens: number;
  elapsedMs: number;
  model: string;
}>;

// The SVG-generation port. Deliberately minimal (one prompt in, one SVG document
// out) so a text model reached over `CompletionClient` and any dedicated vector
// tool both normalize to the same contract and the benchmark domain never
// branches on provider. An adapter over a text completion unwraps the SVG from
// the model's fences/prose before returning it.
export type SvgGenerationClient = Readonly<{
  model: string;
  generateSvg: (prompt: string) => Promise<GeneratedSvg>;
}>;

// The grounded-answer port for the trend-recency topic. Deliberately minimal
// (one question in, one cited answer out) so a search-native product (Sonar), a
// tool-augmented chat model, and an ungrounded control all normalize to the same
// contract and the benchmark domain never branches on provider.
export type GroundedAnswerClient = Readonly<{
  model: string;
  answer: (question: string) => Promise<GroundedAnswer>;
}>;

// Separate from `CompletionClient` so text-only probes keep their existing
// contract. Vision callers opt into this port explicitly, with a typed capability
// record showing that image input is supported for the chosen model/configuration.
export type VisionClient = Readonly<{
  model: string;
  capability: VisionCapability;
  completeVision: (
    input: VisionInput,
    options?: VisionOptions,
  ) => Promise<Completion>;
  completeVisionStructured: (
    input: VisionInput,
    schema: JsonSchema,
    options?: VisionOptions,
  ) => Promise<StructuredCompletion>;
}>;

// ── Computer use (browser-driving agent) ─────────────────────────────────────
// The port for the computer-use topic: a subject model, driven through the fixed
// Playwright harness, attempts one browser task end to end and reports the full
// trajectory. Deliberately provider-neutral — an Anthropic `computer_20251124`
// tool loop, an OpenAI Responses `computer` tool loop, and a Gemini `computer_use`
// loop all normalize to this one contract, so the benchmark domain never branches
// on provider. Success is decided by the harness (it evaluates the task's
// declarative predicate against the live DOM after the loop) and reported here as
// a boolean; the domain scores trajectories, it does not drive the browser.

export type ComputerUseActionKind =
  | "navigate"
  | "click"
  | "type"
  | "select"
  | "scroll"
  | "key"
  | "wait"
  | "screenshot"
  | "submit";

// One actuated step. `target` is a provider-neutral description of what the
// action addressed (a URL, a selector, or typed text); `latencyMs` is the
// wall-clock from issuing the action to the next observation; `recovered` marks a
// step the agent took to recover from a failed or rejected prior action (the
// robustness signal the recovery-rate metric aggregates).
export type ComputerUseAction = Readonly<{
  kind: ComputerUseActionKind;
  target: string;
  latencyMs: number;
  recovered: boolean;
}>;

// The minimal, provider-neutral task descriptor the harness needs to drive one
// attempt. The domain's richer `BrowserTask` (goal + declarative success
// predicate + optimal-step reference) narrows to this at the vendor boundary so
// no topic-domain type leaks into an adapter.
export type ComputerUseTaskInput = Readonly<{
  id: string;
  goal: string;
  startUrl: string;
}>;

// The normalized outcome of one task attempt. Token counts are summed across all
// turns of the loop (screenshots dominate the input side); `wallClockMs` is the
// end-to-end time. Bytes/screenshots are never returned — only the trajectory and
// usage the domain needs to score.
export type TaskAttempt = Readonly<{
  taskId: string;
  succeeded: boolean;
  actions: ReadonlyArray<ComputerUseAction>;
  wallClockMs: number;
  inputTokens: number;
  outputTokens: number;
}>;

export type ComputerUseClient = Readonly<{
  model: string;
  attemptTask: (task: ComputerUseTaskInput) => Promise<TaskAttempt>;
}>;

// ── Computer-use harness policy seam ─────────────────────────────────────────
// "One fixed harness, only the model varies": the Playwright harness owns
// everything shared — serving the pinned site, navigating, actuating, observing,
// and deciding success through the domain predicate. A subject supplies only an
// `AgentPolicy`: the think step that turns one observation into the next command.
// The keyless oracle policy plugs into the SAME seam, so the harness loop is
// proven end to end with no model and no spend.

// What the harness shows the policy each step. `pageText` and `axSnapshot` are the
// textual views a model reasons over; `screenshotBase64` is the pixel view a
// coordinate-based computer-use tool consumes; `lastError` is set when the prior
// command failed to actuate (the recovery signal the recovery-rate metric reads).
export type HarnessObservation = Readonly<{
  stepIndex: number;
  url: string;
  pageText: string;
  axSnapshot: string;
  screenshotBase64?: string;
  viewport: Readonly<{ width: number; height: number }>;
  lastError?: string;
}>;

// The normalized command vocabulary the harness actuates. `finish` ends the loop
// (the harness then reads the final page and evaluates the task predicate). Every
// non-`finish` kind is also a `ComputerUseActionKind`, so an actuated command
// records straight into the trajectory. A command may address the page by CSS
// selector (the oracle path) or by pixel coordinate (the provider tools) — the
// harness supports both.
export type HarnessCommandKind =
  | "navigate"
  | "click"
  | "type"
  | "select"
  | "scroll"
  | "key"
  | "wait"
  | "submit"
  | "finish";

export type HarnessCommand = Readonly<{
  kind: HarnessCommandKind;
  /** CSS selector the command targets (selector-based actuation). */
  selector?: string;
  /** Pixel coordinate the command targets (coordinate-based actuation). */
  point?: Readonly<{ x: number; y: number }>;
  /** Text to type (`type`) or the URL to open (`navigate`). */
  text?: string;
  /** Key name for a `key` press (e.g. "Enter"). */
  key?: string;
}>;

// One think step's result: the command to actuate plus the usage the domain
// scores. The harness owns wall-clock timing, so a policy reports only tokens.
// `recovered` marks a step taken to recover from a prior failed command.
export type PolicyStep = Readonly<{
  command: HarnessCommand;
  inputTokens: number;
  outputTokens: number;
  recovered: boolean;
}>;

// One in-flight attempt's think stream. `next` is called once per harness step
// with the current observation; a provider brain keeps its conversation state in
// this closure, so a fresh `begin` starts a clean attempt.
export type PolicyAttempt = Readonly<{
  next: (observation: HarnessObservation) => Promise<PolicyStep>;
}>;

// The provider-neutral think seam. `begin` sets up per-attempt state (a fresh
// provider conversation, or a fresh oracle script cursor) and returns the think
// stream the harness drives.
export type AgentPolicy = Readonly<{
  model: string;
  begin: (task: ComputerUseTaskInput) => PolicyAttempt;
}>;
