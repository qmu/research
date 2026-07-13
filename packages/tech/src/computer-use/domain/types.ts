/** Providers with an API-native computer-use tool. xAI is deliberately absent:
 * it exposes no computer-use tool and is recorded as a non-subject instead. */
export type ComputerUseProvider = "anthropic" | "openai" | "google";

export type ComputerUseModelCard = Readonly<{
  /** Registry id (CLI selector and artifact key). */
  id: string;
  provider: ComputerUseProvider;
  modelName: string;
  apiModelId: string;
  /** The provider's computer-use tool identifier (e.g. `computer_20251124`). */
  toolVersion: string;
  /** The API surface the tool is invoked through (Messages / Responses / Gemini). */
  apiSurface: string;
  /** Curated catalog token prices, USD per 1M tokens (screenshots dominate input). */
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  /** Date the ids/prices were last checked against `source`. */
  lastVerified: string;
  source: string;
}>;

export type NonSubjectProvider = Readonly<{
  providerName: string;
  reason: string;
  lastVerified: string;
}>;

export type TaskCategory =
  | "navigation"
  | "search"
  | "form"
  | "extraction"
  | "multi-step";

/** How the harness decides a task succeeded, declared so it is mechanically
 * checkable and drift-free (no LLM-as-judge). The harness evaluates this against
 * the live DOM/URL after the agent loop ends. */
export type SuccessPredicate = Readonly<{
  kind: "url-ends-with" | "text-present" | "input-value" | "element-count";
  /** The target the predicate checks (a URL suffix, a text string, a
   * `selector=value`, or a `selector=count`), human- and machine-readable. */
  detail: string;
}>;

export type BrowserTask = Readonly<{
  id: string;
  category: TaskCategory;
  /** The natural-language instruction handed to the agent. */
  goal: string;
  /** Path on the pinned fixture site the attempt starts from. */
  startPath: string;
  successPredicate: SuccessPredicate;
  /** Reference minimal action count for a clean solve (context for steps stats). */
  optimalSteps: number;
}>;

/** The versioned, self-contained task suite. Pinned so a trial is reproducible;
 * changing tasks or the site is a suite-version bump, and history charts connect
 * same-version points only. */
export type TaskSuiteManifest = Readonly<{
  version: string;
  /** The pinned browser environment the tasks run against. */
  siteBase: string;
  tasks: ReadonlyArray<BrowserTask>;
}>;

export type Stat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

/** One task attempt, scored. The full per-action trajectory lives in the vendor
 * layer; the domain keeps the decision-relevant per-attempt figures. */
export type ComputerUseCallRecord = Readonly<{
  taskId: string;
  category: TaskCategory;
  repetition: number;
  succeeded: boolean;
  /** Actions taken (trajectory length). */
  steps: number;
  wallClockMs: number;
  /** Mean per-action latency over the attempt. */
  latencyPerActionMs: number;
  /** Token cost of the attempt, USD (all turns, at the card's catalog prices). */
  costUsd: number;
  /** The attempt included at least one recovery from a failed/rejected action. */
  recovered: boolean;
}>;

export type Provenance = "measured" | "fixtured" | "error";

/** The six metrics, aggregated over a subject's attempts. Keys are the stable
 * metric names the site design metadata and the snapshot trend extractor read. */
export type ComputerUseStats = Readonly<{
  /** Fraction of attempts whose predicate held (higher is better). */
  taskSuccessRate: Stat;
  /** Actions per successful attempt (lower is better). */
  stepsToComplete: Stat;
  /** Mean per-action latency (lower is better). */
  latencyPerActionMs: Stat;
  /** End-to-end wall-clock per attempt (lower is better). */
  wallClockPerTaskMs: Stat;
  /** Token cost per attempt (lower is better). */
  costPerTaskUsd: Stat;
  /** Fraction of attempts that needed a recovery (secondary robustness signal). */
  recoveryRate: Stat;
}>;

export type ComputerUseModelRun = Readonly<{
  id: string;
  provider: ComputerUseProvider;
  modelName: string;
  apiModelId: string;
  toolVersion: string;
  apiSurface: string;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  source: string;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: ComputerUseStats;
  calls: ReadonlyArray<ComputerUseCallRecord>;
  error?: string;
}>;

export type ComputerUseResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  harness: string;
  suiteVersion: string;
  runs: ReadonlyArray<ComputerUseModelRun>;
  nonSubjects: ReadonlyArray<NonSubjectProvider>;
  artifactPath: string;
}>;
