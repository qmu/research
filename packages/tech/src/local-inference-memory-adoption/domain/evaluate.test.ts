import { describe, expect, it } from "vitest";
import {
  evaluateMemoryAdoption,
  evaluateMemoryAdoptionForAllUseCases,
} from "./evaluate";
import type { MemoryUseCase, PeakMemoryReading } from "./types";

const useCase: MemoryUseCase = {
  id: "test-use-case",
  label: "Test use case",
  hostRamPeakMiB: 10000,
  gpuVramPeakMiB: 20000,
  rationale: "test",
};

const reading = (value: number): PeakMemoryReading => ({
  value,
  unit: "MiB",
});
const missing = (
  reason: "NO-FIELD" | "MEASURE-FAILED" | "NOT-RUN" = "NOT-RUN",
): PeakMemoryReading => ({ value: null, unit: "MiB", reason });

describe("evaluateMemoryAdoption", () => {
  it("adopts when both metrics clear their ceiling", () => {
    const verdict = evaluateMemoryAdoption(
      useCase,
      reading(9000),
      reading(15000),
    );
    expect(verdict.decision).toBe("adopt");
    expect(verdict.hostRamPeak).toBe("adopt");
    expect(verdict.gpuVramPeak).toBe("adopt");
  });

  it("adopts at exactly the ceiling", () => {
    const verdict = evaluateMemoryAdoption(
      useCase,
      reading(10000),
      reading(20000),
    );
    expect(verdict.decision).toBe("adopt");
  });

  it("rejects when host RAM peak exceeds its ceiling, even if GPU VRAM adopts", () => {
    const verdict = evaluateMemoryAdoption(useCase, reading(10001), reading(1));
    expect(verdict.decision).toBe("reject");
    expect(verdict.hostRamPeak).toBe("reject");
    expect(verdict.gpuVramPeak).toBe("adopt");
  });

  it("rejects when GPU VRAM peak exceeds its ceiling, even if host RAM adopts", () => {
    const verdict = evaluateMemoryAdoption(useCase, reading(1), reading(20001));
    expect(verdict.decision).toBe("reject");
  });

  it("is undetermined, not adopted, when a reading is missing and nothing rejects", () => {
    const verdict = evaluateMemoryAdoption(useCase, missing(), reading(1));
    expect(verdict.decision).toBe("undetermined");
    expect(verdict.hostRamPeak).toBe("undetermined");
    expect(verdict.gpuVramPeak).toBe("adopt");
  });

  it("rejects outright even when the other metric is missing", () => {
    const verdict = evaluateMemoryAdoption(useCase, reading(10001), missing());
    expect(verdict.decision).toBe("reject");
  });

  it("is undetermined when both readings are missing", () => {
    const verdict = evaluateMemoryAdoption(useCase, missing(), missing());
    expect(verdict.decision).toBe("undetermined");
  });
});

describe("evaluateMemoryAdoptionForAllUseCases", () => {
  it("evaluates every use case independently, in order", () => {
    const strict: MemoryUseCase = {
      ...useCase,
      id: "strict",
      hostRamPeakMiB: 1,
    };
    const loose: MemoryUseCase = {
      ...useCase,
      id: "loose",
      hostRamPeakMiB: 100000,
    };
    const verdicts = evaluateMemoryAdoptionForAllUseCases(
      [strict, loose],
      reading(500),
      reading(1),
    );
    expect(verdicts.map((v) => [v.useCase, v.decision])).toEqual([
      ["strict", "reject"],
      ["loose", "adopt"],
    ]);
  });
});
