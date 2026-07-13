/**
 * Domain types for the Agent VM / sandbox comparison. Two metric families:
 *
 *  - REFERENCE metrics are curated catalog data read from each provider's docs
 *    (isolation model, published price, capability envelope). They are keyless
 *    and carry a cited source + last-verified date, never a live measurement.
 *  - MEASURED metrics come from a live probe that boots a sandbox and times it
 *    (cold start, warm reuse, fixed-task wall-clock, derived cost). They are
 *    owner-gated and credential-gated; the keyless fixture path stands in for
 *    them with deterministic numbers so CI stays green without spend.
 *
 * No vendor SDK type leaks here — the probe reaches providers through the
 * `vendors/sandbox` anti-corruption port.
 */

/** Isolation boundary a provider states it uses. Categorical (reference). */
export type IsolationModel = "firecracker" | "gvisor" | "kata" | "container";

/** How the provider meters running time (reference). */
export type BillingGranularity =
  | "per-second"
  | "per-100ms"
  | "per-minute"
  | "per-hour";

/** Whether the sandbox filesystem survives across invocations (reference). */
export type FilesystemPersistence = "ephemeral" | "persistent";

/** Outbound network posture the provider exposes by default (reference). */
export type NetworkEgress = "open" | "restricted";

/**
 * One subject in the curated registry: a sandbox/microVM provider with its
 * reference metrics. `apiReachable` records whether a probe adapter can boot it
 * from CI given a credential; a provider with no adapter yet stays catalog-only
 * and its measured cells read `unreachable`.
 */
export type SandboxProviderCard = Readonly<{
  /** Registry id (CLI selector and artifact key). */
  id: string;
  providerName: string;
  isolationModel: IsolationModel;
  /** Published price per vCPU-hour at the standard tier (curated). */
  publishedVcpuHourUsd: number;
  /** Published price per GB-hour of memory at the standard tier (curated). */
  publishedGbHourUsd: number;
  billingGranularity: BillingGranularity;
  /** Documented maximum single-run duration in seconds; null = unbounded. */
  maxRuntimeSeconds: number | null;
  /** Whether the provider can snapshot/pause and resume a sandbox. */
  snapshotResume: boolean;
  filesystemPersistence: FilesystemPersistence;
  networkEgress: NetworkEgress;
  gpuAvailable: boolean;
  /** Whether a probe adapter exists to boot this provider (credential-gated). */
  apiReachable: boolean;
  /** Date the ids/prices/capabilities were last checked against `source`. */
  lastVerified: string;
  source: string;
}>;

/** Mean, sample standard deviation, and count over a sample vector. */
export type Stat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

/** How a row's measured numbers were produced. */
export type Provenance = "measured" | "fixtured" | "unreachable" | "error";

/** One boot/reuse/task cycle recorded in full for the artifact. */
export type ProbeSample = Readonly<{
  repetition: number;
  coldStartMs: number;
}>;

/**
 * A provider's measured slice: cold-start distribution (p50/p95 + stats), one
 * warm-reuse latency, the fixed-task wall-clock, and the cost derived from the
 * task's vCPU-seconds at the published rate. Populated by the fixture on the
 * keyless path and by real adapters on the gated real path.
 */
export type SandboxMeasurement = Readonly<{
  provenance: Provenance;
  repetitions: number;
  coldStartMsP50: number;
  coldStartMsP95: number;
  coldStartStat: Stat;
  warmReuseMs: number;
  fixedTaskWallClockMs: number;
  measuredCostUsd: number;
  samples: ReadonlyArray<ProbeSample>;
  error?: string;
}>;

/** A registry card joined with its measurement for one run. */
export type SandboxRun = Readonly<{
  card: SandboxProviderCard;
  measurement: SandboxMeasurement;
}>;

/** The fixed CPU workload every provider runs so wall-clock is comparable. */
export type FixedTask = Readonly<{
  id: string;
  description: string;
}>;

/** The full run record — the shape written to `<artifact>.data.json`. */
export type AgentVmResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  repetitions: number;
  task: FixedTask;
  runs: ReadonlyArray<SandboxRun>;
  artifactPath: string;
}>;
