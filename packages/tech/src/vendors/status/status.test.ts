import { describe, expect, it } from "vitest";
import {
  STATUS_SOURCES,
  fetchStatusObservation,
  fixtureStatusFetch,
  observeAllStatus,
} from "./index";

const FETCHED_AT = "2026-01-01T00:00:00.000Z";

const sourceFor = (provider: string) => {
  const source = STATUS_SOURCES.find((s) => s.provider === provider);
  if (source === undefined) throw new Error(`no source ${provider}`);
  return source;
};

describe("vendors/status adapters over committed fixtures", () => {
  it("normalizes a healthy Statuspage summary (Anthropic)", async () => {
    const obs = await fetchStatusObservation(
      sourceFor("anthropic"),
      fixtureStatusFetch,
      FETCHED_AT,
    );
    expect(obs.fetchOk).toBe(true);
    expect(obs.overallDescription).toBe("All Systems Operational");
    expect(obs.components).toHaveLength(4);
    expect(obs.components.every((c) => c.status === "operational")).toBe(true);
    expect(obs.activeIncidents).toHaveLength(0);
    expect(obs.recentIncidents).toHaveLength(0);
    expect(obs.pageUpdatedAt).toBe("2025-12-31T23:40:00.000Z");
    expect(obs.fetchedAt).toBe(FETCHED_AT);
  });

  it("splits active vs. resolved incidents and drops group containers (OpenAI)", async () => {
    const obs = await fetchStatusObservation(
      sourceFor("openai"),
      fixtureStatusFetch,
      FETCHED_AT,
    );
    // The `group: true` "APIs" container is excluded; three leaf components remain.
    expect(obs.components).toHaveLength(3);
    expect(obs.components.find((c) => c.name === "API")?.status).toBe(
      "degraded_performance",
    );
    expect(obs.activeIncidents.map((i) => i.status)).toEqual(["monitoring"]);
    expect(obs.recentIncidents.map((i) => i.status)).toEqual(["resolved"]);
    expect(obs.recentIncidents[0].resolvedAt).toBe("2025-12-30T10:30:00.000Z");
  });

  it("folds scheduled maintenance into active incidents with maintenance impact (xAI)", async () => {
    const obs = await fetchStatusObservation(
      sourceFor("xai"),
      fixtureStatusFetch,
      FETCHED_AT,
    );
    expect(obs.activeIncidents).toHaveLength(1);
    expect(obs.activeIncidents[0].impact).toBe("maintenance");
    expect(obs.components.find((c) => c.name === "Grok")?.status).toBe(
      "under_maintenance",
    );
  });

  it("normalizes Google's incidents.json with empty components and no page timestamp", async () => {
    const obs = await fetchStatusObservation(
      sourceFor("google"),
      fixtureStatusFetch,
      FETCHED_AT,
    );
    expect(obs.components).toEqual([]);
    expect(obs.pageUpdatedAt).toBeNull();
    expect(obs.activeIncidents).toHaveLength(1);
    expect(obs.activeIncidents[0].impact).toBe("major");
    expect(obs.recentIncidents).toHaveLength(1);
    expect(obs.recentIncidents[0].impact).toBe("critical");
    expect(obs.recentIncidents[0].url).toBe(
      "https://status.cloud.google.com/incidents/gc-resolved",
    );
  });

  it("records an honest fetch failure without fabricating a status", async () => {
    const obs = await fetchStatusObservation(
      sourceFor("anthropic"),
      async () => {
        throw new Error("boom");
      },
      FETCHED_AT,
    );
    expect(obs.fetchOk).toBe(false);
    expect(obs.fetchError).toBe("boom");
    expect(obs.components).toEqual([]);
    expect(obs.overallDescription).toBeNull();
  });

  it("observes all sources deterministically from the fixtures", async () => {
    const a = await observeAllStatus(fixtureStatusFetch, FETCHED_AT);
    const b = await observeAllStatus(fixtureStatusFetch, FETCHED_AT);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.map((o) => o.provider)).toEqual([
      "anthropic",
      "google",
      "openai",
      "xai",
    ]);
  });
});
