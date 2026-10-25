import { describe, expect, it } from "vitest";
import { parseLatencyMemoryRuns } from "./parse-runs.js";

describe("parseLatencyMemoryRuns", () => {
  it("parses a mix of verified and unverified runs", () => {
    const runs = parseLatencyMemoryRuns({
      runs: [
        {
          engine: "mlx",
          label: "trial-1",
          reading: {
            status: "verified",
            initialDelayMs: 95,
            peakRssMiB: 6100,
          },
        },
        {
          engine: "ollama",
          label: "trial-1",
          reading: { status: "unverified", reason: "NO-FIELD" },
        },
      ],
    });

    expect(runs).toEqual([
      {
        engine: "mlx",
        label: "trial-1",
        reading: {
          status: "verified",
          initialDelayMs: 95,
          peakRssMiB: 6100,
        },
      },
      {
        engine: "ollama",
        label: "trial-1",
        reading: { status: "unverified", reason: "NO-FIELD" },
      },
    ]);
  });

  it("rejects a document that is not an object", () => {
    expect(() => parseLatencyMemoryRuns(null)).toThrow(
      "document must be an object",
    );
    expect(() => parseLatencyMemoryRuns("oops")).toThrow(
      "document must be an object",
    );
  });

  it("rejects a document whose runs field is not an array", () => {
    expect(() => parseLatencyMemoryRuns({ runs: {} })).toThrow(
      "document.runs must be an array",
    );
  });

  it("rejects a run missing engine or label", () => {
    expect(() =>
      parseLatencyMemoryRuns({
        runs: [
          {
            label: "trial-1",
            reading: { status: "unverified", reason: "x" },
          },
        ],
      }),
    ).toThrow("runs[0].engine must be a non-empty string");
    expect(() =>
      parseLatencyMemoryRuns({
        runs: [
          { engine: "mlx", reading: { status: "unverified", reason: "x" } },
        ],
      }),
    ).toThrow("runs[0].label must be a non-empty string");
  });

  it("rejects a verified reading with a non-finite metric", () => {
    expect(() =>
      parseLatencyMemoryRuns({
        runs: [
          {
            engine: "mlx",
            label: "trial-1",
            reading: {
              status: "verified",
              initialDelayMs: Number.NaN,
              peakRssMiB: 6100,
            },
          },
        ],
      }),
    ).toThrow(/initialDelayMs\/peakRssMiB is not a finite number/);
  });

  it("rejects an unverified reading without a reason", () => {
    expect(() =>
      parseLatencyMemoryRuns({
        runs: [
          {
            engine: "mlx",
            label: "trial-1",
            reading: { status: "unverified" },
          },
        ],
      }),
    ).toThrow("reason is missing");
  });

  it("rejects an unknown reading status", () => {
    expect(() =>
      parseLatencyMemoryRuns({
        runs: [
          { engine: "mlx", label: "trial-1", reading: { status: "pending" } },
        ],
      }),
    ).toThrow('reading.status must be "verified" or "unverified"');
  });
});
