/**
 * The per-topic research pipeline's shared vocabulary: every research topic
 * (speed, accuracy, RAG, OCR, availability, …) is registered as a `TopicSpec`
 * and runs through the same pipeline — benchmark → data artifact →
 * [EN insights] → [JP translation]. This module is pure: it defines the specs,
 * the registry, and the pipeline plan; the effectful runner bindings (which
 * legacy entrypoint implements a topic's benchmark) live in
 * `entrypoints/run-research.ts`.
 *
 * This is the skeleton stage of the migration: each existing topic is
 * registered with its current benchmark behavior unchanged, and the insights /
 * translation stages are declared but not yet implemented (later tickets plug
 * generators into the declared slots).
 */

/** How a topic run is invoked. Keyless `fixture` stays byte-stable and on CI;
 * `estimate` prints cost without provider calls; `real` is owner-triggered. */
export type TopicMode = "fixture" | "estimate" | "real";

/** Pipeline stages in canonical order. `benchmark` produces the deterministic
 * data artifact; `insights` and `translation` are LLM-generated, real-run-only
 * layers added by later tickets. */
export type TopicStage = "benchmark" | "insights" | "translation";

const STAGE_ORDER: ReadonlyArray<TopicStage> = [
  "benchmark",
  "insights",
  "translation",
];

export type TopicSpec = Readonly<{
  /** CLI id: `research <id>`. */
  id: string;
  /** Short English description of what the topic compares. */
  title: string;
  /** Report/artifact base name under `docs/research-reports/` (no extension). */
  artifactBase: string;
  /** Run modes the topic's benchmark runner supports. */
  modes: ReadonlyArray<TopicMode>;
  /**
   * argv prefix that reproduces each mode on the topic's legacy entrypoint
   * (they predate the unified CLI and disagree on flags: OCR defaults to
   * fixture and takes `--real`, the others default to real and take
   * `--fixture`). Kept as data so the dispatcher stays a thin, testable map.
   */
  modeArgv: Readonly<Partial<Record<TopicMode, ReadonlyArray<string>>>>;
  /** Stages this topic's pipeline runs, in `STAGE_ORDER` order. */
  stages: ReadonlyArray<TopicStage>;
  /**
   * What the "benchmark" stage does. `benchmark` (default) runs a live probe
   * sweep; `catalog` generates a reference table from a source of truth (no
   * measurement); `article` points at a hand-written reference article. The
   * last two are non-measured REFERENCE topics whose provenance says so.
   */
  kind?: "benchmark" | "catalog" | "article";
  /** For `article` topics: repo-relative path to the hand-written article. */
  articlePath?: string;
}>;

/**
 * Registry of research topics. Adding a topic means adding a spec here and a
 * runner binding in `entrypoints/run-research.ts`; ids are the public CLI
 * surface and must stay unique.
 */
export const TOPICS: ReadonlyArray<TopicSpec> = [
  {
    id: "llm-model-comparison",
    title:
      "LLM model comparison: throughput, latency, structured-output and accuracy probes over a model × effort matrix",
    artifactBase: "llm-model-comparison",
    modes: ["fixture", "estimate", "real"],
    modeArgv: { fixture: ["--fixture"], estimate: ["--estimate"], real: [] },
    stages: ["benchmark"],
  },
  {
    id: "speed",
    title:
      "LLM response speed: sustained throughput, time-to-first-token, and total latency (projection of the compare sweep)",
    artifactBase: "llm-speed-comparison",
    modes: ["fixture", "estimate", "real"],
    modeArgv: { fixture: ["--fixture"], estimate: ["--estimate"], real: [] },
    stages: ["benchmark", "insights", "translation"],
  },
  {
    id: "accuracy",
    title:
      "LLM output accuracy: JSON-schema limits, length-instruction following, and information accuracy (projection of the compare sweep)",
    artifactBase: "llm-accuracy-comparison",
    modes: ["fixture", "estimate", "real"],
    modeArgv: { fixture: ["--fixture"], estimate: ["--estimate"], real: [] },
    stages: ["benchmark", "insights", "translation"],
  },
  {
    id: "rag",
    title: "RAG / vector store benchmark: retrieval quality and operations",
    artifactBase: "rag-benchmark",
    modes: ["fixture", "estimate", "real"],
    modeArgv: { fixture: ["--fixture"], estimate: ["--estimate"], real: [] },
    stages: ["benchmark", "insights", "translation"],
  },
  {
    id: "ocr",
    title: "OCR capability comparison: CER/WER over synthetic documents",
    artifactBase: "ocr-comparison",
    modes: ["fixture", "estimate", "real"],
    // The OCR entrypoint defaults to its keyless fixture and switches to a
    // real run with --real (the reverse of the other topics).
    modeArgv: { fixture: [], estimate: ["--estimate"], real: ["--real"] },
    stages: ["benchmark", "insights", "translation"],
  },
  {
    id: "availability",
    title:
      "LLM provider availability: status-page incident history with 30/90-day derived-uptime trends",
    artifactBase: "llm-availability",
    modes: ["fixture", "estimate", "real"],
    // The real path fetches each provider's PUBLIC status page (no model API
    // call) and uses an LLM to extract incidents into an accumulating history;
    // fixture renders 30/90-day trends from the committed history (keyless).
    modeArgv: { fixture: ["--fixture"], estimate: ["--estimate"], real: [] },
    stages: ["benchmark", "insights", "translation"],
  },
  {
    id: "foundation-models",
    title:
      "Foundation model catalog: provider, tier, price, effort, API surface (reference catalog, not measured)",
    artifactBase: "foundation-models",
    // A catalog is generated deterministically from models.ts; every mode
    // produces the same keyless reference table (no provider calls). Insights
    // and translation still run (real path) to give the catalog an
    // interpretation layer and a Japanese version, marked catalog-provenance.
    modes: ["fixture", "estimate", "real"],
    modeArgv: { fixture: [], estimate: [], real: [] },
    stages: ["benchmark", "insights", "translation"],
    kind: "catalog",
  },
  {
    id: "agent-sdk",
    title:
      "Agent SDK comparison: agent framework/runtime design comparison (design-comparison, not measured)",
    artifactBase: "agent-sdk-comparison",
    modes: ["fixture", "estimate", "real"],
    modeArgv: { fixture: [], estimate: [], real: [] },
    stages: ["benchmark"],
    kind: "article",
    articlePath: "docs/llm-foundation/agent-sdk-comparison.md",
  },
];

export const findTopic = (id: string): TopicSpec | undefined =>
  TOPICS.find((topic) => topic.id === id);

export const topicIds = (): ReadonlyArray<string> =>
  TOPICS.map((topic) => topic.id);

/**
 * The argv to hand the topic's legacy entrypoint for a given mode, with any
 * extra user args passed through untouched (behavior-preserving wiring).
 * Throws on a mode the topic does not support.
 */
export const buildLegacyArgv = (
  spec: TopicSpec,
  mode: TopicMode,
  rest: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const prefix = spec.modeArgv[mode];
  if (!spec.modes.includes(mode) || prefix === undefined) {
    throw new Error(
      `topic '${spec.id}' does not support --${mode} (supported: ${spec.modes.join(", ")})`,
    );
  }
  return [...prefix, ...rest];
};

/**
 * The stages a run plans, in canonical order. The LLM stages (insights,
 * translation) are non-deterministic and key-gated, so they never run on the
 * keyless `fixture` path (that would break byte-stability). They ARE included
 * for `estimate` — which is `real`'s dry run and must price them — and for
 * `real`, where they execute. The caller distinguishes execute-vs-price by mode.
 */
export const planPipeline = (
  spec: TopicSpec,
  mode: TopicMode,
): ReadonlyArray<TopicStage> =>
  STAGE_ORDER.filter(
    (stage) =>
      spec.stages.includes(stage) &&
      (stage === "benchmark" || mode === "real" || mode === "estimate"),
  );
