import { describe, expect, it } from "vitest";
import {
  emptyStatusTally,
  summarizeStatusObservation,
  tallyComponentStatuses,
  type StatusObservation,
} from "./availability";

const observation = (
  overrides: Partial<StatusObservation> = {},
): StatusObservation => ({
  provider: "anthropic",
  providerName: "Anthropic",
  sourceUrl: "https://status.anthropic.com/api/v2/summary.json",
  fetchedAt: "2026-01-01T00:00:00.000Z",
  pageUpdatedAt: "2025-12-31T23:00:00.000Z",
  fetchOk: true,
  fetchError: null,
  overallDescription: "All Systems Operational",
  overallIndicator: "none",
  components: [
    { name: "API", status: "operational" },
    { name: "Console", status: "degraded_performance" },
    { name: "Workbench", status: "partial_outage" },
  ],
  activeIncidents: [
    {
      name: "Elevated error rates",
      impact: "major",
      status: "investigating",
      startedAt: "2026-01-01T00:00:00.000Z",
      resolvedAt: null,
      url: "https://status.anthropic.com/incidents/x",
    },
  ],
  recentIncidents: [],
  ...overrides,
});

describe("status observation summary", () => {
  it("tallies component statuses across the closed union", () => {
    const tally = tallyComponentStatuses([
      { name: "A", status: "operational" },
      { name: "B", status: "operational" },
      { name: "C", status: "major_outage" },
    ]);
    expect(tally).toEqual({
      ...emptyStatusTally(),
      operational: 2,
      major_outage: 1,
    });
  });

  it("summarizes components, non-operational list, and incident counts", () => {
    const summary = summarizeStatusObservation(observation());
    expect(summary.componentCount).toBe(3);
    expect(summary.operationalCount).toBe(1);
    expect(summary.statusTally.degraded_performance).toBe(1);
    expect(summary.statusTally.partial_outage).toBe(1);
    expect(summary.nonOperationalComponents.map((c) => c.name)).toEqual([
      "Console",
      "Workbench",
    ]);
    expect(summary.activeIncidentCount).toBe(1);
    expect(summary.recentIncidentCount).toBe(0);
    expect(summary.sourceUrl).toContain("status.anthropic.com");
    expect(summary.fetchOk).toBe(true);
  });

  it("preserves an honest fetch failure without inventing a status", () => {
    const summary = summarizeStatusObservation(
      observation({
        fetchOk: false,
        fetchError: "fetch timed out after 8000ms",
        overallDescription: null,
        overallIndicator: null,
        components: [],
        activeIncidents: [],
        recentIncidents: [],
      }),
    );
    expect(summary.fetchOk).toBe(false);
    expect(summary.fetchError).toContain("timed out");
    expect(summary.componentCount).toBe(0);
    expect(summary.operationalCount).toBe(0);
    expect(summary.nonOperationalComponents).toEqual([]);
  });
});
