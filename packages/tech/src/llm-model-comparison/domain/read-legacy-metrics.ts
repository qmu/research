import { summarizeTrials } from "./aggregate";
import type { ConfigRun, ProbeStats, TrialMetrics, TrialResult } from "./types";

// The July 9 v1 artifacts predate the information-accuracy probe. Absence
// means unmeasured, never a zero score or an inferred result from saved text.
export type LegacyMetricsConfig = Omit<ConfigRun, "trials" | "stats"> &
  Readonly<{
    trials: ReadonlyArray<
      Omit<TrialResult, "metrics"> & {
        metrics: Omit<TrialMetrics, "informationAccuracy"> &
          Partial<Pick<TrialMetrics, "informationAccuracy">>;
      }
    >;
    stats: Omit<ProbeStats, "informationAccuracy"> &
      Partial<Pick<ProbeStats, "informationAccuracy">>;
  }>;

/** Normalize only the metric absent from pre-information-probe JSON. */
export const readLegacyMetrics = (
  configs: ReadonlyArray<LegacyMetricsConfig>,
): ReadonlyArray<ConfigRun> => {
  let changed = false;
  const next = configs.map((config): ConfigRun => {
    const missingTrialMetric = (config.trials ?? []).some(
      (trial) => trial.metrics.informationAccuracy === undefined,
    );
    if (!missingTrialMetric && config.stats.informationAccuracy !== undefined) {
      return config as ConfigRun;
    }
    changed = true;
    const trials = (config.trials ?? []).map((trial) => ({
      ...trial,
      metrics: {
        ...trial.metrics,
        informationAccuracy: trial.metrics.informationAccuracy ?? null,
      },
    }));
    return {
      ...config,
      trials,
      stats: {
        ...config.stats,
        informationAccuracy: summarizeTrials(trials).informationAccuracy,
      },
    };
  });
  return changed ? next : (configs as ReadonlyArray<ConfigRun>);
};
