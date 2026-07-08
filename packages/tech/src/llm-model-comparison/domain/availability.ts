import type { Provider } from "./types";

// Availability is meaningful only as an explicitly sampled time series. This
// spec is intentionally part of the code so a run artifact says how its points
// were produced, and so docs cannot imply more certainty than the sampler gives.
export type AvailabilityFailureType =
  | "timeout"
  | "server_error"
  | "rate_limit"
  | "network_error"
  | "client_error"
  | "unknown_error";

export type AvailabilitySamplingSpec = Readonly<{
  version: "manual-health-probe-v1";
  cadence: "manual-on-demand";
  intervalMs: number;
  timeoutMs: number;
  samplesPerProvider: number;
  consecutiveFailureThreshold: number;
  requestOrigin: string;
  rateLimitClassification: string;
  censoring: string;
  downDefinition: string;
}>;

export const DEFAULT_AVAILABILITY_SAMPLING_SPEC: AvailabilitySamplingSpec = {
  version: "manual-health-probe-v1",
  cadence: "manual-on-demand",
  intervalMs: 60_000,
  timeoutMs: 10_000,
  samplesPerProvider: 3,
  consecutiveFailureThreshold: 2,
  requestOrigin:
    "Manual operator environment running packages/tech. Record the concrete region/network with --origin or AVAILABILITY_REQUEST_ORIGIN for every real run.",
  rateLimitClassification:
    "HTTP 429 / provider quota errors are recorded as rate_limit and excluded from service-outage down runs.",
  censoring:
    "Unknown gaps before the first sample, after the last sample, and between separate manual runs are censored; no uptime or downtime is inferred across those gaps.",
  downDefinition:
    "A provider is counted as down only after at least two consecutive non-rate-limit outage-eligible failures (timeout, 5xx/server_error, or network_error) within one defined observation window. Client errors and rate limits are not service downtime.",
};

export type ObservationWindow = Readonly<{
  startedAt: string;
  endedAt: string;
  durationMs: number;
}>;

export type AvailabilitySample = Readonly<{
  provider: Provider;
  targetModelId: string;
  targetModelName: string;
  observedAt: string;
  ok: boolean;
  responseTimeMs: number | null;
  failureType: AvailabilityFailureType | null;
}>;

export type AvailabilityDownRun = Readonly<{
  startedAt: string;
  endedAt: string;
  sampleCount: number;
  observedDurationMs: number;
  failureTypes: Readonly<Record<AvailabilityFailureType, number>>;
}>;

export type AvailabilitySummary = Readonly<{
  provider: Provider;
  targetModelId: string;
  targetModelName: string;
  n: number;
  observationWindow: ObservationWindow | null;
  successCount: number;
  failureCount: number;
  successRate: number;
  meanResponseTimeMs: number | null;
  failureTypeBreakdown: Readonly<Record<AvailabilityFailureType, number>>;
  rateLimitCount: number;
  downFrequency: number | null;
  downtimeDurationMs: number | null;
  downRuns: ReadonlyArray<AvailabilityDownRun>;
}>;

export type AvailabilityHistoryPoint = AvailabilitySummary &
  Readonly<{
    measuredAt: string;
    samplingSpecVersion: AvailabilitySamplingSpec["version"];
    cadence: AvailabilitySamplingSpec["cadence"];
  }>;

export const AVAILABILITY_HEALTH_PROMPT =
  "Reply with exactly the lowercase token ok.";

export const AVAILABILITY_ESTIMATE_INPUT_TOKENS = 12;
export const AVAILABILITY_ESTIMATE_OUTPUT_TOKENS = 2;

const FAILURE_TYPES: ReadonlyArray<AvailabilityFailureType> = [
  "timeout",
  "server_error",
  "rate_limit",
  "network_error",
  "client_error",
  "unknown_error",
];

const emptyBreakdown = (): Record<AvailabilityFailureType, number> => ({
  timeout: 0,
  server_error: 0,
  rate_limit: 0,
  network_error: 0,
  client_error: 0,
  unknown_error: 0,
});

const isOutageEligible = (
  failureType: AvailabilityFailureType | null,
): boolean =>
  failureType === "timeout" ||
  failureType === "server_error" ||
  failureType === "network_error";

const observedDurationMs = (
  run: ReadonlyArray<AvailabilitySample>,
  spec: AvailabilitySamplingSpec,
): number => {
  if (run.length === 0) return 0;
  const first = Date.parse(run[0].observedAt);
  const last = Date.parse(run[run.length - 1].observedAt);
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return spec.timeoutMs;
  }
  const lastProbeMs = run[run.length - 1].responseTimeMs ?? spec.timeoutMs;
  return Math.max(0, last - first) + lastProbeMs;
};

const toDownRun = (
  run: ReadonlyArray<AvailabilitySample>,
  spec: AvailabilitySamplingSpec,
): AvailabilityDownRun => {
  const failureTypes = emptyBreakdown();
  for (const sample of run) {
    if (sample.failureType !== null) {
      failureTypes[sample.failureType] += 1;
    }
  }
  return {
    startedAt: run[0].observedAt,
    endedAt: run[run.length - 1].observedAt,
    sampleCount: run.length,
    observedDurationMs: observedDurationMs(run, spec),
    failureTypes,
  };
};

export const availabilityFailureBreakdown = (
  samples: ReadonlyArray<AvailabilitySample>,
): Readonly<Record<AvailabilityFailureType, number>> => {
  const out = emptyBreakdown();
  for (const sample of samples) {
    if (!sample.ok && sample.failureType !== null) {
      out[sample.failureType] += 1;
    }
  }
  return out;
};

export const availabilityDownRuns = (
  samples: ReadonlyArray<AvailabilitySample>,
  spec: AvailabilitySamplingSpec,
): ReadonlyArray<AvailabilityDownRun> => {
  const runs: AvailabilityDownRun[] = [];
  let current: AvailabilitySample[] = [];
  const flush = () => {
    if (current.length >= spec.consecutiveFailureThreshold) {
      runs.push(toDownRun(current, spec));
    }
    current = [];
  };

  for (const sample of samples) {
    if (!sample.ok && isOutageEligible(sample.failureType)) {
      current.push(sample);
    } else {
      flush();
    }
  }
  flush();
  return runs;
};

export const summarizeAvailability = (
  samples: ReadonlyArray<AvailabilitySample>,
  spec: AvailabilitySamplingSpec,
  observationWindow: ObservationWindow | null,
): AvailabilitySummary => {
  const first = samples[0];
  if (first === undefined) {
    throw new Error("summarizeAvailability requires at least one sample");
  }
  const successes = samples.filter((sample) => sample.ok);
  const responseTimes = successes
    .map((sample) => sample.responseTimeMs)
    .filter((value): value is number => value !== null);
  const failureTypeBreakdown = availabilityFailureBreakdown(samples);
  const downRuns = availabilityDownRuns(samples, spec);
  const downtimeDurationMs =
    observationWindow === null
      ? null
      : downRuns.reduce((sum, run) => sum + run.observedDurationMs, 0);
  return {
    provider: first.provider,
    targetModelId: first.targetModelId,
    targetModelName: first.targetModelName,
    n: samples.length,
    observationWindow,
    successCount: successes.length,
    failureCount: samples.length - successes.length,
    successRate: successes.length / samples.length,
    meanResponseTimeMs:
      responseTimes.length === 0
        ? null
        : responseTimes.reduce((sum, value) => sum + value, 0) /
          responseTimes.length,
    failureTypeBreakdown,
    rateLimitCount: failureTypeBreakdown.rate_limit,
    downFrequency: observationWindow === null ? null : downRuns.length,
    downtimeDurationMs,
    downRuns,
  };
};

export const toAvailabilityHistoryPoint = (
  summary: AvailabilitySummary,
  measuredAt: string,
  spec: AvailabilitySamplingSpec,
): AvailabilityHistoryPoint => ({
  ...summary,
  measuredAt,
  samplingSpecVersion: spec.version,
  cadence: spec.cadence,
});

export const availabilityFailureTypes =
  (): ReadonlyArray<AvailabilityFailureType> => FAILURE_TYPES;
