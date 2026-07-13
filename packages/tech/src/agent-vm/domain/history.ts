/**
 * The agent-vm accumulated-history projection. Pure: turns one trial's result
 * into a compact per-provider history point, appends it to an ever-growing
 * history file, and selects the same-instrument-version series a trend chart
 * connects. The full per-repetition record stays in the archived artifact; a
 * history point keeps only the two trend-able summary metrics agreed in the
 * proposal (cold-start p50 and the published vCPU-hour rate). File IO lives in
 * the entrypoint — this module only shapes data, so it is unit-testable.
 */

import type {
  AgentVmResult,
  IsolationModel,
  Provenance,
  SandboxRun,
} from "./types";

/** The two metrics the trend block plots per provider. */
export type AgentVmHistoryMetric = "coldStartMsP50" | "publishedVcpuHourUsd";

export type AgentVmHistoryPoint = Readonly<{
  id: string;
  providerName: string;
  isolationModel: IsolationModel;
  provenance: Provenance;
  /** Measured cold-start p50 (ms); 0 on unreachable/error rows. */
  coldStartMsP50: number;
  /** Reference published price ($/vCPU-hr) at trial time. */
  publishedVcpuHourUsd: number;
  measuredAt: string;
}>;

export type AgentVmHistoryEntry = Readonly<{
  generatedAt: string;
  instrumentVersion: string;
  repetitions: number;
  points: ReadonlyArray<AgentVmHistoryPoint>;
}>;

export type AgentVmHistoryFile = Readonly<{
  entries: ReadonlyArray<AgentVmHistoryEntry>;
}>;

/** One point on a provider's trend line for a chosen metric. */
export type TrendSample = Readonly<{ generatedAt: string; value: number }>;

/** A provider's connected trend line over the same-instrument-version entries. */
export type ProviderTrend = Readonly<{
  id: string;
  providerName: string;
  samples: ReadonlyArray<TrendSample>;
}>;

/** Project one provider's run into its compact history point. */
export const toHistoryPoint = (
  run: SandboxRun,
  measuredAt: string,
): AgentVmHistoryPoint => ({
  id: run.card.id,
  providerName: run.card.providerName,
  isolationModel: run.card.isolationModel,
  provenance: run.measurement.provenance,
  coldStartMsP50: run.measurement.coldStartMsP50,
  publishedVcpuHourUsd: run.card.publishedVcpuHourUsd,
  measuredAt,
});

/** Build a trial's history entry: every provider's point, stamped with the
 * run's wall clock, trial count, and instrument version. */
export const buildHistoryEntry = (
  result: AgentVmResult,
  instrumentVersion: string,
): AgentVmHistoryEntry => ({
  generatedAt: result.generatedAt,
  instrumentVersion,
  repetitions: result.repetitions,
  points: result.runs.map((run) => toHistoryPoint(run, result.generatedAt)),
});

/** Append a trial's entry to the (possibly empty/absent) history file, newest
 * last. ISO `generatedAt` stamps sort lexicographically = chronologically. */
export const appendHistory = (
  file: AgentVmHistoryFile | null,
  entry: AgentVmHistoryEntry,
): AgentVmHistoryFile => ({
  entries: [...(file?.entries ?? []), entry],
});

const metricValue = (
  point: AgentVmHistoryPoint,
  metric: AgentVmHistoryMetric,
): number =>
  metric === "coldStartMsP50"
    ? point.coldStartMsP50
    : point.publishedVcpuHourUsd;

/** Whether a point contributes a real value for the metric. Cold-start is only
 * meaningful on probed rows; the reference price is always meaningful. */
const pointContributes = (
  point: AgentVmHistoryPoint,
  metric: AgentVmHistoryMetric,
): boolean =>
  metric === "publishedVcpuHourUsd"
    ? true
    : point.provenance === "measured" || point.provenance === "fixtured";

/**
 * Per-provider trend series for a metric, connecting ONLY points from entries
 * whose `instrumentVersion` matches `instrumentVersion` (a metric measured
 * under a different fixed task is not comparable). Entries are taken oldest to
 * newest; providers keep their first-seen order. Providers with no contributing
 * point are omitted.
 */
export const providerTrends = (
  file: AgentVmHistoryFile,
  metric: AgentVmHistoryMetric,
  instrumentVersion: string,
): ReadonlyArray<ProviderTrend> => {
  const entries = [...file.entries]
    .filter((entry) => entry.instrumentVersion === instrumentVersion)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
  const order: string[] = [];
  const byId = new Map<string, TrendSample[]>();
  const names = new Map<string, string>();
  for (const entry of entries) {
    for (const point of entry.points) {
      if (!pointContributes(point, metric)) continue;
      if (!byId.has(point.id)) {
        byId.set(point.id, []);
        order.push(point.id);
        names.set(point.id, point.providerName);
      }
      byId.get(point.id)?.push({
        generatedAt: entry.generatedAt,
        value: metricValue(point, metric),
      });
    }
  }
  return order.map((id) => ({
    id,
    providerName: names.get(id) ?? id,
    samples: byId.get(id) ?? [],
  }));
};
