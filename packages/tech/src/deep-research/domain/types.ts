/** Provider tags for the deep-research topic. Anthropic is present as the
 * transparent build-your-own BASELINE (Claude + web_search + extended thinking),
 * not as a turnkey deep-research product — the `baseline` flag on its card marks
 * that so the comparison reads "turnkey vs. the loop we can build ourselves". */
export type DeepResearchProvider =
  | "openai"
  | "perplexity"
  | "google"
  | "xai"
  | "anthropic";

export type SubjectCard = Readonly<{
  /** Registry id (CLI selector and artifact key). */
  id: string;
  provider: DeepResearchProvider;
  displayName: string;
  apiModelId: string;
  /** How the endpoint is reached (documented access shape, e.g. "Responses API,
   * web search always-on" or "Interactions API, background=True"). */
  access: string;
  /** Curated reference midpoint of per-query cost in USD (catalog data with a
   * cited source, never a measurement). The binding figure comes from
   * `--estimate` once real clients exist. */
  approxCostPerQueryUsd: number;
  /** Date the id/access/price were last checked against `source`. */
  lastVerified: string;
  source: string;
  /** True only for the Anthropic in-house baseline subject. */
  baseline?: boolean;
}>;

/** One mechanically checkable yes/no criterion the LLM judge answers about a
 * report. Kept deliberately narrow (checkable coverage, not aesthetic quality)
 * so grading is reproducible across subjects. */
export type RubricItem = Readonly<{
  id: string;
  /** The exact yes/no question put to the judge. */
  question: string;
}>;

export type ResearchQuestion = Readonly<{
  id: string;
  /** The research question posed to every subject verbatim. */
  prompt: string;
  rubric: ReadonlyArray<RubricItem>;
}>;

export type QuestionManifest = Readonly<{
  version: string;
  questions: ReadonlyArray<ResearchQuestion>;
}>;

export type JudgeAnswer = Readonly<{
  rubricId: string;
  satisfied: boolean;
}>;

/** Whether one cited source resolved and supported the claim it was cited for.
 * On the keyless fixture path every check is echoed valid; the real fetch+judge
 * implementation is a follow-on ticket. */
export type CitationCheck = Readonly<{
  url: string;
  valid: boolean;
}>;

export type Stat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

export type Provenance = "measured" | "fixtured" | "error";

/** One deep-research query + judgement, recorded in full. The report text itself
 * is not committed (only its length); the artifact keeps every score, timing,
 * cost, and citation domain so a report renders at any detail level. */
export type DeepResearchCallRecord = Readonly<{
  questionId: string;
  repetition: number;
  latencyMs: number;
  costUsd: number;
  reportCharLength: number;
  citationCount: number;
  /** Registrable domains of the cited sources (deduped by the domain layer). */
  citationDomains: ReadonlyArray<string>;
  sourceDiversity: number;
  /** Web searches the endpoint performed, when the provider reports it. */
  searchCount?: number;
  judgeAnswers?: ReadonlyArray<JudgeAnswer>;
  answerQuality?: number;
  citationChecks?: ReadonlyArray<CitationCheck>;
  citationValidity?: number;
  error?: string;
}>;

export type SubjectRun = Readonly<{
  id: string;
  provider: DeepResearchProvider;
  displayName: string;
  apiModelId: string;
  access: string;
  approxCostPerQueryUsd: number;
  source: string;
  baseline: boolean;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: Readonly<{
    answerQuality: Stat;
    citationValidity: Stat;
    sourceDiversity: Stat;
    citationCount: Stat;
    latencyMs: Stat;
    costUsd: Stat;
  }>;
  calls: ReadonlyArray<DeepResearchCallRecord>;
  error?: string;
}>;

export type DeepResearchResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  judgeModel: string;
  manifestVersion: string;
  runs: ReadonlyArray<SubjectRun>;
  artifactPath: string;
}>;
