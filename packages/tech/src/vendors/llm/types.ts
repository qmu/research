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
