import { describe, it, expect, vi } from "vitest";
import { startPeakRss } from "./peak-rss.js";
import { peakRssReading } from "../domain/peak-memory.js";
import { computeMemoryMargin } from "../../local-inference-memory-margin/domain/margin.js";

describe("per-run server RSS", () => {
  it("keeps the maximum, converts KiB to MiB and feeds fixed tier math", async () => {
    vi.useFakeTimers();
    try {
      const readKiB = vi
        .fn()
        .mockResolvedValueOnce(2048)
        .mockResolvedValueOnce(8192)
        .mockResolvedValue(4096);
      const sampler = startPeakRss(123, { supported: true, readKiB });
      await vi.advanceTimersByTimeAsync(100);
      const peak = await sampler.stop();
      expect(peak).toMatchObject({
        value: 8,
        samples: 3,
        reason: "SAMPLED",
        scope: "single-server-process",
      });
      expect(
        computeMemoryMargin(peakRssReading(peak), {
          label: "test",
          totalMiB: 16,
        }),
      ).toMatchObject({ marginMiB: 8 });
      await vi.advanceTimersByTimeAsync(100);
      expect(readKiB).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
  it.each([
    [undefined, true, "NO-PID"],
    [123, false, "UNSUPPORTED-HOST"],
  ] as const)(
    "records unavailable reason without reading: %s",
    async (pid, supported, reason) => {
      const readKiB = vi.fn();
      const peak = await startPeakRss(pid, { supported, readKiB }).stop();
      expect(peak).toMatchObject({ value: null, reason, samples: 0 });
      expect(readKiB).not.toHaveBeenCalled();
      expect(peakRssReading(peak)).toMatchObject({
        value: null,
        reason: "NOT-RUN",
      });
    },
  );
  it.each([NaN, Infinity, 0, -1])(
    "rejects invalid sample %s",
    async (value) => {
      const peak = await startPeakRss(1, {
        supported: true,
        readKiB: async () => value,
      }).stop();
      expect(peakRssReading(peak)).toMatchObject({
        value: null,
        reason: "MEASURE-FAILED",
      });
    },
  );
  it("waits for pending reads and does not persist raw errors", async () => {
    const peak = await startPeakRss(1, {
      supported: true,
      readKiB: async () => {
        throw new Error("private endpoint");
      },
    }).stop();
    expect(peak.reason).toBe("SAMPLE-FAILED");
    expect(JSON.stringify(peak)).not.toContain("private");
  });
});
