/** Providers whose search-augmented surfaces this topic compares. Perplexity is
 * the one provider not in the shared foundation-model catalog — Sonar is a
 * search-native product with no ungrounded twin — so it appears here only. */
export type TrendProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "perplexity";

/** Whether the subject answers with a live web/search tool enabled (`grounded`)
 * or from parametric memory alone (`ungrounded`). Every grounded subject is
 * paired with an ungrounded control of the same base model so the metric
 * isolates the contribution of live retrieval; Sonar is grounded-only. */
export type GroundingMode = "grounded" | "ungrounded";

export type TrendModelCard = Readonly<{
  /** Registry id (CLI selector and artifact key). */
  id: string;
  provider: TrendProvider;
  grounding: GroundingMode;
  modelName: string;
  apiModelId: string;
  /** Curated catalog token prices (USD per million tokens), not measured. */
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  /** Grounded subjects bill web/search separately from tokens: USD per 1000
   * search requests / grounded queries. 0 for ungrounded controls. Best-known
   * estimate until a real trial measures true billing. */
  searchCostPerKRequestsUsd: number;
  /** Date the id, prices, and grounding surface were last checked against `source`. */
  lastVerified: string;
  source: string;
}>;

/** A recent-event probe with committed ground truth. `eventDateIso` anchors the
 * event in time so citation freshness is measured relative to it; `expectedKeywords`
 * are the normalized tokens a correct answer must contain — the keyless, mechanical
 * recency proxy. The semantic LLM-judge grade (and the hallucination metric) is a
 * later ticket, exactly as the SVG topic defers its vision-judge fidelity metric. */
export type RecencyProbe = Readonly<{
  id: string;
  topic: string;
  question: string;
  eventDateIso: string;
  expectedAnswer: string;
  expectedKeywords: ReadonlyArray<string>;
}>;

export type ProbeManifest = Readonly<{
  version: string;
  /** Real probes are drawn from the trailing window before each trial; recorded
   * so a reader knows the probes' recency horizon. */
  windowDays: number;
  probes: ReadonlyArray<RecencyProbe>;
}>;

/** One source a grounded answer cited. `publishedDateIso` drives the freshness
 * metric; absent when the surface returns bare URLs. */
export type Citation = Readonly<{
  url: string;
  publishedDateIso?: string;
  title?: string;
}>;

export type Stat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

export type Provenance = "measured" | "fixtured" | "error";

/** One answered probe, recorded in full so the artifact can be re-scored (e.g.
 * once the LLM-judge grade lands) without re-running the paid call. */
export type TrendCallRecord = Readonly<{
  probeId: string;
  repetition: number;
  latencyMs: number;
  outputTokens: number;
  answer: string;
  citations: ReadonlyArray<Citation>;
  /** 1 when the answer contains every expected keyword, else 0 (mechanical proxy). */
  answerMatch: number;
  /** 1 when the answer honestly declines to assert a recent fact. Abstention is
   * NOT a hallucination — kept separate so the later hallucination judge credits it. */
  abstained: number;
  /** Fraction of returned citations with a well-formed http(s) URL. */
  citationValidity: number;
  citationCount: number;
  /** Median published-age of dated citations, in days relative to the event;
   * absent when no citation carries a parseable date (e.g. ungrounded controls). */
  citationFreshnessDays?: number;
  error?: string;
}>;

export type TrendModelRun = Readonly<{
  id: string;
  provider: TrendProvider;
  grounding: GroundingMode;
  modelName: string;
  apiModelId: string;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  searchCostPerKRequestsUsd: number;
  source: string;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: Readonly<{
    /** Ratio of probes answered correctly (mechanical proxy today). */
    recencyAccuracy: Stat;
    abstentionRate: Stat;
    citationValidity: Stat;
    /** Over the calls that carried dated citations only. */
    citationFreshnessDays: Stat;
    latencyMs: Stat;
  }>;
  calls: ReadonlyArray<TrendCallRecord>;
  error?: string;
}>;

export type TrendRecencyResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  manifestVersion: string;
  windowDays: number;
  runs: ReadonlyArray<TrendModelRun>;
  artifactPath: string;
}>;
