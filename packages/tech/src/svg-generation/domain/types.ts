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

/** One mechanically-checkable yes/no rubric question the fixed vision judge
 * answers over the rasterized drawing. Judged from a still raster, so the
 * question addresses what is drawn, never whether it moves (motion is the
 * source-level animation-presence metric). */
export type SvgRubricConstraint = Readonly<{
  id: string;
  question: string;
}>;

/** One judge verdict for one rubric constraint. */
export type SvgJudgeAnswer = Readonly<{
  constraintId: string;
  satisfied: boolean;
}>;

export type SvgPrompt = Readonly<{
  id: string;
  kind: SvgPromptKind;
  /** The instruction handed to the model (the runner appends the format rule). */
  prompt: string;
  /** The prompt-fidelity rubric the fixed vision judge answers over the
   * rasterized SVG. Part of the versioned instrument. */
  constraints: ReadonlyArray<SvgRubricConstraint>;
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
  /** Satisfied rubric constraints / total, judged by the fixed vision judge
   * over the rasterized SVG; 0 when the source cannot rasterize. */
  promptFidelity: number;
  /** The judge's per-constraint verdicts, kept verbatim for the artifact.
   * Absent when the SVG never reached the judge (unrenderable source). */
  judgeAnswers?: ReadonlyArray<SvgJudgeAnswer>;
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
    /** Over every call — an unrenderable SVG contributes 0, never a gap. */
    promptFidelity: Stat;
  }>;
  calls: ReadonlyArray<SvgGenCallRecord>;
  error?: string;
}>;

export type SvgGenerationResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  /** The fixed vision judge behind the prompt-fidelity metric
   * (`fixture-judge` on the keyless path). Swapping it is an instrument
   * change, never silent. */
  judgeModel: string;
  /** The rasterizer engine whose stills the judge read (instrument provenance;
   * `fixture-raster` on the keyless path). */
  rasterizer: string;
  manifestVersion: string;
  runs: ReadonlyArray<SvgGenModelRun>;
  nonSubjects: ReadonlyArray<NonSubjectProvider>;
  artifactPath: string;
}>;
