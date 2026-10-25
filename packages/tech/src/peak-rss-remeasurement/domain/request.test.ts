import { describe, expect, it } from "vitest";
import {
  createPeakRssRemeasurementRequest,
  missingReasons,
} from "./request.js";

const source = {
  runId: "run-example-1",
  engine: "mlx",
  model: "example/model",
  fixture: "fixture-v1",
  runnerVersion: "runner-v1",
  targetCommit: "a".repeat(40),
};
const snapshot = (reading: unknown, savedSource: unknown = source) => ({
  source: savedSource,
  metrics: { peak_rss: reading },
});
const missing = { value: null, unit: "MiB", reason: "NO-FIELD" };

describe("peak RSS remeasurement request", () => {
  it.each(missingReasons)(
    "preserves the fixed %s reason and full identity",
    (reason) => {
      expect(
        createPeakRssRemeasurementRequest(
          source,
          snapshot({ ...missing, reason }),
        ),
      ).toEqual({
        schemaVersion: 1,
        kind: "peak-rss-remeasurement-request",
        source,
        metric: "peak_rss",
        reason,
        requiresNewRunId: true,
        requiresNewArtifact: true,
      });
    },
  );
  it.each(Object.keys(source))("rejects mismatched %s", (key) => {
    const value = key === "targetCommit" ? "b".repeat(40) : "different";
    expect(() =>
      createPeakRssRemeasurementRequest(
        source,
        snapshot(missing, { ...source, [key]: value }),
      ),
    ).toThrow("SOURCE-MISMATCH");
  });
  it.each(Object.keys(source))("rejects missing %s on either side", (key) => {
    const incomplete = { ...source, [key]: undefined };
    expect(() =>
      createPeakRssRemeasurementRequest(incomplete, snapshot(missing)),
    ).toThrow("INVALID-IDENTITY");
    expect(() =>
      createPeakRssRemeasurementRequest(source, snapshot(missing, incomplete)),
    ).toThrow("INVALID-IDENTITY");
  });
  it.each([
    "",
    "main",
    "abc123",
    "a".repeat(39),
    "a".repeat(41),
    " a".repeat(20),
  ])("rejects an unpinned commit %s", (targetCommit) => {
    const invalid = { ...source, targetCommit };
    expect(() =>
      createPeakRssRemeasurementRequest(invalid, snapshot(missing, invalid)),
    ).toThrow("INVALID-IDENTITY");
  });
  it.each([undefined, "", "UNKNOWN", "TIMEOUT"])(
    "rejects unknown missing reason %s",
    (reason) => {
      expect(() =>
        createPeakRssRemeasurementRequest(
          source,
          snapshot({ ...missing, reason }),
        ),
      ).toThrow("INVALID-PEAK-RSS");
    },
  );
  it.each([undefined, "12", 0, -1, NaN, Infinity])(
    "does not turn invalid RSS %s into a retry",
    (value) => {
      expect(() =>
        createPeakRssRemeasurementRequest(
          source,
          snapshot({ value, unit: "MiB" }),
        ),
      ).toThrow("INVALID-PEAK-RSS");
    },
  );
  it("returns no request for a measured RSS", () => {
    expect(
      createPeakRssRemeasurementRequest(
        source,
        snapshot({ value: 1024, unit: "MiB" }),
      ),
    ).toBeNull();
  });
  it("rejects contradictory status and unsupported units", () => {
    for (const reading of [
      { ...missing, value: 12 },
      { ...missing, unit: "bytes" },
    ])
      expect(() =>
        createPeakRssRemeasurementRequest(source, snapshot(reading)),
      ).toThrow("INVALID-PEAK-RSS");
  });
  it.each([null, [], {}, { source }, { source, metrics: {} }])(
    "rejects malformed snapshots",
    (saved) => {
      expect(() => createPeakRssRemeasurementRequest(source, saved)).toThrow();
    },
  );
  it("copies only allowlisted fields and does not retain mutable source references", () => {
    const input = { ...source, diagnostic: "private diagnostic" };
    const saved = {
      ...snapshot({ ...missing, diagnostic: "private diagnostic" }, input),
      extra: "private diagnostic",
    };
    const request = createPeakRssRemeasurementRequest(input, saved);
    input.fixture = "changed";
    expect(request?.source).toEqual(source);
    expect(JSON.stringify(request)).not.toContain("private diagnostic");
  });
});
