import { describe, expect, it } from "vitest";
import {
  memoryUseCaseById,
  memoryUseCaseCatalogStatus,
  memoryUseCases,
} from "./catalog";

describe("memoryUseCases", () => {
  it("loads the three authored use cases with positive finite ceilings", () => {
    expect(memoryUseCases.map((useCase) => useCase.id)).toEqual([
      "interactive-coding-assistant",
      "batch-document-summarization",
      "edge-offline-device",
    ]);
    for (const useCase of memoryUseCases) {
      expect(useCase.hostRamPeakMiB).toBeGreaterThan(0);
      expect(useCase.gpuVramPeakMiB).toBeGreaterThan(0);
      expect(Number.isFinite(useCase.hostRamPeakMiB)).toBe(true);
      expect(Number.isFinite(useCase.gpuVramPeakMiB)).toBe(true);
    }
  });

  it("is explicitly marked as a proposal, not a measured verdict", () => {
    expect(memoryUseCaseCatalogStatus).toBe("proposed");
  });
});

describe("memoryUseCaseById", () => {
  it("returns the matching use case", () => {
    const useCase = memoryUseCaseById("edge-offline-device");
    expect(useCase.label).toBe("Edge / offline device");
  });

  it("throws on an unknown id", () => {
    expect(() => memoryUseCaseById("does-not-exist")).toThrow(
      /unknown memory use case/,
    );
  });
});
