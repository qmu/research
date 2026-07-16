/** Provider tags for SVG generation. All four subjects are text models that
 * emit SVG source through their ordinary completion API — there is no dedicated
 * "SVG API", so the provider set mirrors the foundation-model catalog's text
 * providers rather than the image-generation subset. */
export type SvgProvider = "anthropic" | "openai" | "google" | "xai";

export type SvgModelCard = Readonly<{
  /** Registry id (CLI selector and artifact key). */
  id: string;
  provider: SvgProvider;
  modelName: string;
  apiModelId: string;
  /** Curated catalog token prices (USD per million tokens), not measured. */
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  /** Date the id and prices were last checked against `source`. */
  lastVerified: string;
  source: string;
}>;

/** A subject that emits no usable SVG, recorded explicitly so the report shows an
 * honest not-applicable row instead of silently omitting it (vendor neutrality). */
export type NonSubjectProvider = Readonly<{
  providerName: string;
  reason: string;
  lastVerified: string;
}>;

/** Whether the prompt asks for a still drawing or a motion (SMIL/CSS) drawing.
 * The animation-presence metric is only scored for `animated` prompts. */
export type SvgPromptKind = "static" | "animated";

export type SvgPrompt = Readonly<{
  id: string;
  kind: SvgPromptKind;
  /** The instruction handed to the model (the runner appends the format rule). */
  prompt: string;
}>;

export type PromptManifest = Readonly<{
  version: string;
  prompts: ReadonlyArray<SvgPrompt>;
}>;

export type Stat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

/** One generation + mechanical scoring, recorded in full. The SVG source is text
 * and small, so — unlike the image benchmark — the bytes are safe to keep in the
 * artifact for later re-scoring. */
export type SvgGenCallRecord = Readonly<{
  promptId: string;
  kind: SvgPromptKind;
  repetition: number;
  latencyMs: number;
  svgByteLength: number;
  outputTokens: number;
  /** 1 when the source is well-formed XML rooted at <svg>, else 0. */
  renderValid: number;
  /** Drawable-element + path-command count — higher means more detail. */
  pathComplexity: number;
  /** 1/0 presence of a SMIL or CSS animation. Only set for `animated` prompts. */
  animationPresence?: number;
  /** The generated SVG source, kept verbatim for the artifact. */
  svg?: string;
  error?: string;
}>;

export type Provenance = "measured" | "fixtured" | "error";

export type SvgGenModelRun = Readonly<{
  id: string;
  provider: SvgProvider;
  modelName: string;
  apiModelId: string;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  source: string;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: Readonly<{
    generationLatencyMs: Stat;
    renderValidity: Stat;
    pathComplexity: Stat;
    /** Over `animated` prompts only. */
    animationPresence: Stat;
  }>;
  calls: ReadonlyArray<SvgGenCallRecord>;
  error?: string;
}>;

export type SvgGenerationResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  manifestVersion: string;
  runs: ReadonlyArray<SvgGenModelRun>;
  nonSubjects: ReadonlyArray<NonSubjectProvider>;
  artifactPath: string;
}>;
