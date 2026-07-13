import { describe, expect, it } from "vitest";
import {
  computeAvailabilityWindow,
  mergeIncidents,
  summarizeTrend,
  type AvailabilityIncident,
  type ProviderAvailabilityRecord,
} from "./availability";

const incident = (
  over: Partial<AvailabilityIncident> &
    Pick<AvailabilityIncident, "id" | "startedAt">,
): AvailabilityIncident => ({
  title: "Incident",
  impact: "major",
  affectedProducts: [],
  endedAt: null,
  reportedUptimePct: null,
  sourceUrl: null,
  ...over,
});

const record = (
  incidents: ReadonlyArray<AvailabilityIncident>,
): ProviderAvailabilityRecord => ({
  provider: "openai",
  providerName: "OpenAI",
  sourceUrl: "https://status.openai.com/api/v2/incidents.json",
  sourceKind: "statuspage-json",
  available: true,
  note: null,
  lastFetchedAt: "2026-07-09T12:00:00.000Z",
  asOf: "2026-07-09T12:00:00.000Z",
  extraction: { model: "claude-test", extractedAt: "2026-07-09T12:00:00.000Z" },
  incidents,
});

describe("mergeIncidents", () => {
  it("keeps earliest start, applies incoming resolution, unions products", () => {
    const existing = [
      incident({
        id: "a",
        startedAt: "2026-07-08T00:00:00.000Z",
        endedAt: null,
        affectedProducts: ["API"],
      }),
    ];
    const incoming = [
      incident({
        id: "a",
        startedAt: "2026-07-08T00:05:00.000Z",
        endedAt: "2026-07-08T02:00:00.000Z",
        affectedProducts: ["Console"],
      }),
      incident({ id: "b", startedAt: "2026-07-01T00:00:00.000Z" }),
    ];
    const merged = mergeIncidents(existing, incoming);
    expect(merged.map((i) => i.id)).toEqual(["a", "b"]);
    const a = merged.find((i) => i.id === "a");
    expect(a?.startedAt).toBe("2026-07-08T00:00:00.000Z");
    expect(a?.endedAt).toBe("2026-07-08T02:00:00.000Z");
    expect(a?.affectedProducts).toEqual(["API", "Console"]);
  });
});

describe("computeAvailabilityWindow", () => {
  const r = record([
    incident({
      id: "major",
      impact: "major",
      startedAt: "2026-07-08T00:00:00.000Z",
      endedAt: "2026-07-08T02:00:00.000Z",
    }),
    incident({
      id: "minor",
      impact: "minor",
      startedAt: "2026-07-07T00:00:00.000Z",
      endedAt: "2026-07-07T01:00:00.000Z",
    }),
    incident({
      id: "maint",
      impact: "maintenance",
      startedAt: "2026-07-06T00:00:00.000Z",
      endedAt: "2026-07-06T03:00:00.000Z",
    }),
  ]);

  it("weights downtime by impact and excludes maintenance", () => {
    const w = computeAvailabilityWindow(r, 30);
    // major 120min * 0.5 + minor 60min * 0.1 = 66 weighted downtime minutes.
    expect(w.downtimeMinutes).toBe(66);
    expect(w.maintenanceMinutes).toBe(180);
    expect(w.windowMinutes).toBe(30 * 1440);
    expect(w.uptimePct).toBe(0.99847);
    expect(w.incidentCount).toBe(2);
    expect(w.majorIncidentCount).toBe(1);
    expect(w.perDay).toHaveLength(30);
  });

  it("renders per-day uptime for the affected days", () => {
    const w = computeAvailabilityWindow(r, 30);
    const day8 = w.perDay.find((p) => p.date === "2026-07-08");
    const day7 = w.perDay.find((p) => p.date === "2026-07-07");
    const day1 = w.perDay.find((p) => p.date === "2026-06-30");
    // major 120min * 0.5 = 60 weighted downtime minutes on day 8.
    expect(day8?.downtimeMinutes).toBe(60);
    expect(day8?.uptimePct).toBe(0.95833);
    expect(day7?.downtimeMinutes).toBe(6);
    expect(day1?.uptimePct).toBe(1);
  });

  it("caps a single long incident at 24h so it cannot dominate the index", () => {
    const w = computeAvailabilityWindow(
      record([
        incident({
          id: "long",
          impact: "critical",
          startedAt: "2026-06-20T00:00:00.000Z",
          endedAt: "2026-06-24T00:00:00.000Z", // 96h real, capped to 24h counted
        }),
      ]),
      30,
    );
    expect(w.downtimeMinutes).toBe(24 * 60);
    expect(w.uptimePct).toBe(0.96667);
    // The incident is still counted as one occurrence in the window.
    expect(w.incidentCount).toBe(1);
  });

  it("summarizeTrend produces both 30 and 90 day windows", () => {
    const trend = summarizeTrend(r);
    expect(trend.window30.days).toBe(30);
    expect(trend.window90.days).toBe(90);
    expect(trend.window90.perDay).toHaveLength(90);
    expect(trend.incidentTotal).toBe(3);
  });

  it("handles an unretrievable provider with no incidents", () => {
    const w = computeAvailabilityWindow(
      { ...record([]), available: false, note: "blocked" },
      90,
    );
    expect(w.downtimeMinutes).toBe(0);
    expect(w.uptimePct).toBe(1);
    expect(w.incidentCount).toBe(0);
  });
});
