import { recomputeThroughput } from "./recompute-throughput";
import { readMissingTtftAsNull } from "./missing-ttft";
import type { ConfigRun, ThroughputDefinition } from "./types";

/** Shared fields of stored full comparisons and their speed/accuracy projections. */
export type StoredComparison = Readonly<{
  generatedAt: string;
  configs: ReadonlyArray<ConfigRun>;
  instrumentVersion?: number;
  throughputDefinition?: ThroughputDefinition;
}>;

/**
 * Interpret existing records in memory; never rewrite the archived JSON.
 * Instrument v1 remains v1: filling an absent tag does not upgrade its probes.
 * This is a compatibility entrance for trusted comparison artifacts, not a
 * validator for arbitrary JSON or the separate local-inference interchange.
 */
export function readComparisonArtifact<T extends StoredComparison>(stored: T) {
  if (
    stored.throughputDefinition !== undefined &&
    stored.throughputDefinition !== "post-first-token" &&
    stored.throughputDefinition !== "end-to-end"
  ) {
    throw new Error("Unsupported stored throughput definition");
  }
  const converted = recomputeThroughput(
    stored.configs.map((config) => ({
      ...config,
      measuredAt: config.measuredAt ?? stored.generatedAt,
    })),
    stored.throughputDefinition,
  );
  if (converted.unrecomputable > 0) {
    throw new Error(
      `Cannot migrate ${converted.unrecomputable} stored throughput trial(s): missing timing inputs`,
    );
  }
  const ttft = readMissingTtftAsNull(converted.configs);
  return {
    record: {
      ...stored,
      instrumentVersion: stored.instrumentVersion ?? 1,
      configs: [...ttft.configs],
      throughputDefinition: "end-to-end" as const,
    },
    missingTtftTrials: ttft.converted,
  };
}
