import { describe, expect, it } from "vitest";
import { metricIds } from "./types.js";
import { useCaseById, useCaseCatalogStatus, useCases } from "./catalog.js";

describe("useCases", () => {
  it("loads the three authored use cases, each covering every metric exactly once", () => {
    expect(useCases.map((useCase) => useCase.id)).toEqual([
      "interactive-coding-assistant",
      "batch-document-summarization",
      "edge-offline-device",
    ]);
    for (const useCase of useCases) {
      const ruleMetrics = useCase.rules.map((rule) => rule.metric).sort();
      expect(ruleMetrics).toEqual([...metricIds].sort());
    }
  });

  it("is explicitly marked as a proposal, not a measured verdict", () => {
    expect(useCaseCatalogStatus).toBe("proposed");
  });
});

describe("useCaseById", () => {
  it("returns the matching use case", () => {
    const label = useCaseById("edge-offline-device").label;
    expect(label).toBe("Edge / offline device");
  });

  it("throws on an unknown id", () => {
    expect(() => useCaseById("does-not-exist")).toThrow(/unknown use case/);
  });
});
