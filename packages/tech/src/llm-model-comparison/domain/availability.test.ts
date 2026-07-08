import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVAILABILITY_SAMPLING_SPEC,
  availabilityDownRuns,
  availabilityFailureBreakdown,
  summarizeAvailability,
  type AvailabilitySample,
  type ObservationWindow,
} from "./availability";

const sample = (
  observedAt: string,
  ok: boolean,
  failureType: AvailabilitySample["failureType"] = null,
  responseTimeMs: number | null = ok ? 120 : 10_000,
): AvailabilitySample => ({
  provider: "openai",
  targetModelId: "gpt-test",
  targetModelName: "GPT Test",
  observedAt,
  ok,
  responseTimeMs,
  failureType,
});

const window: ObservationWindow = {
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T00:03:00.000Z",
  durationMs: 180_000,
};

describe("availability aggregation", () => {
  it("computes success rate and failure-type breakdown from known samples", () => {
    const samples = [
      sample("2026-01-01T00:00:00.000Z", true, null, 100),
      sample("2026-01-01T00:01:00.000Z", false, "timeout"),
      sample("2026-01-01T00:02:00.000Z", false, "rate_limit", 80),
      sample("2026-01-01T00:03:00.000Z", true, null, 140),
    ];

    expect(availabilityFailureBreakdown(samples)).toEqual({
      timeout: 1,
      server_error: 0,
      rate_limit: 1,
      network_error: 0,
      client_error: 0,
      unknown_error: 0,
    });

    const summary = summarizeAvailability(
      samples,
      DEFAULT_AVAILABILITY_SAMPLING_SPEC,
      window,
    );
    expect(summary.n).toBe(4);
    expect(summary.successRate).toBe(0.5);
    expect(summary.rateLimitCount).toBe(1);
    expect(summary.meanResponseTimeMs).toBe(120);
    expect(summary.downFrequency).toBe(0);
    expect(summary.downtimeDurationMs).toBe(0);
  });

  it("counts only consecutive outage-eligible failures as down runs", () => {
    const samples = [
      sample("2026-01-01T00:00:00.000Z", true, null, 90),
      sample("2026-01-01T00:01:00.000Z", false, "timeout", 10_000),
      sample("2026-01-01T00:02:00.000Z", false, "server_error", 300),
      sample("2026-01-01T00:03:00.000Z", false, "rate_limit", 50),
      sample("2026-01-01T00:04:00.000Z", false, "network_error", 10_000),
      sample("2026-01-01T00:05:00.000Z", true, null, 100),
    ];

    const runs = availabilityDownRuns(
      samples,
      DEFAULT_AVAILABILITY_SAMPLING_SPEC,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      startedAt: "2026-01-01T00:01:00.000Z",
      endedAt: "2026-01-01T00:02:00.000Z",
      sampleCount: 2,
      observedDurationMs: 60_300,
      failureTypes: {
        timeout: 1,
        server_error: 1,
        rate_limit: 0,
        network_error: 0,
        client_error: 0,
        unknown_error: 0,
      },
    });

    const summary = summarizeAvailability(
      samples,
      DEFAULT_AVAILABILITY_SAMPLING_SPEC,
      {
        startedAt: "2026-01-01T00:00:00.000Z",
        endedAt: "2026-01-01T00:05:00.000Z",
        durationMs: 300_000,
      },
    );
    expect(summary.downFrequency).toBe(1);
    expect(summary.downtimeDurationMs).toBe(60_300);
  });

  it("withholds down frequency and downtime duration without an observation window", () => {
    const summary = summarizeAvailability(
      [
        sample("2026-01-01T00:00:00.000Z", false, "timeout"),
        sample("2026-01-01T00:01:00.000Z", false, "server_error", 300),
      ],
      DEFAULT_AVAILABILITY_SAMPLING_SPEC,
      null,
    );

    expect(summary.downRuns).toHaveLength(1);
    expect(summary.downFrequency).toBeNull();
    expect(summary.downtimeDurationMs).toBeNull();
  });
});
