import type { Provider } from "./types";

// Availability here is a LONGITUDINAL RECORD built from each provider's OWN public
// status-page incident history. We do not measure the providers; an LLM reads
// their (divergent, format-unstable) status pages and normalizes what they report
// into the incident vocabulary below, which accumulates in a committed per-
// provider database. Trends (30/90-day uptime) are then DERIVED deterministically
// from that record — weighted by each incident's reported impact — and presented
// as an observation of the providers' own reports, never as an SLA or ranking.

// The shape of a provider's status source, as far as the fetch/extract layers
// need to distinguish it. Lives in the domain so the extraction prompt/parse
// (pure) and the vendor fetch layer share one vocabulary.
export type StatusSourceKind = "statuspage-json" | "google-json" | "html";

export type IncidentImpact =
  | "none"
  | "minor"
  | "major"
  | "critical"
  | "maintenance"
  | "unknown";

export const INCIDENT_IMPACTS: ReadonlyArray<IncidentImpact> = [
  "none",
  "minor",
  "major",
  "critical",
  "maintenance",
  "unknown",
];

// One incident/maintenance as reported by a provider's status page and extracted
// by the LLM. `endedAt: null` means it was still open at extraction time.
export type AvailabilityIncident = Readonly<{
  id: string;
  title: string;
  impact: IncidentImpact;
  affectedProducts: ReadonlyArray<string>;
  startedAt: string;
  endedAt: string | null;
  reportedUptimePct: number | null;
  sourceUrl: string | null;
}>;

// The accumulating per-provider database (one committed JSON file per provider).
// Real, keyed runs fetch + LLM-extract + merge into this; the render/CI path only
// reads it. `available: false` records an honest non-retrieval (e.g. xAI's
// Cloudflare block) instead of a fabricated status.
export type ProviderAvailabilityRecord = Readonly<{
  provider: Provider;
  providerName: string;
  sourceUrl: string;
  sourceKind: string;
  available: boolean;
  note: string | null;
  lastFetchedAt: string;
  // The observation cutoff the trend windows are measured back from. Committed,
  // so the keyless render is deterministic.
  asOf: string;
  extraction: Readonly<{ model: string; extractedAt: string }> | null;
  incidents: ReadonlyArray<AvailabilityIncident>;
}>;

const DAY_MS = 86_400_000;
const DAY_MINUTES = 1_440;

// A single incident counts toward the provider-level availability index for at
// most this much of its wall-clock. Status pages log incidents at wildly
// different scopes — a model-specific "suspended access" can stay open for weeks
// while affecting only one product — so without a cap one long, narrowly-scoped
// event would dominate the aggregate and make the index meaningless. The full,
// uncapped duration is always preserved in the incident record and shown in the
// history; only the derived index is bounded.
export const MAX_COUNTED_INCIDENT_MS = 24 * 60 * 60 * 1000;

// Fraction of an incident's counted time that weighs on the derived uptime index,
// by severity. A full outage counts fully; a major (usually partial/product-
// scoped) outage counts half; a minor degradation barely dents it; planned
// maintenance is not unplanned downtime and is tracked separately (weight 0).
const IMPACT_DOWNTIME_WEIGHT: Readonly<Record<IncidentImpact, number>> = {
  critical: 1,
  major: 0.5,
  unknown: 0.25,
  minor: 0.1,
  none: 0,
  maintenance: 0,
};

export const impactDowntimeWeight = (impact: IncidentImpact): number =>
  IMPACT_DOWNTIME_WEIGHT[impact];

const parseMs = (iso: string | null): number | null => {
  if (iso === null) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

// Minutes of [aStart, aEnd) that fall within [fromMs, toMs).
const overlapMinutes = (
  aStartMs: number,
  aEndMs: number,
  fromMs: number,
  toMs: number,
): number => {
  const start = Math.max(aStartMs, fromMs);
  const end = Math.min(aEndMs, toMs);
  return end <= start ? 0 : (end - start) / 60_000;
};

const byStartedDesc = (
  a: AvailabilityIncident,
  b: AvailabilityIncident,
): number =>
  (b.startedAt ?? "").localeCompare(a.startedAt ?? "") ||
  a.id.localeCompare(b.id);

const uniqueSorted = (values: ReadonlyArray<string>): string[] =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b));

// Reconcile two extractions of the same incident id. The incoming (latest) fetch
// is authoritative for mutable fields, but we never lose a resolution time or the
// earliest known start we already recorded.
const reconcileIncident = (
  prev: AvailabilityIncident,
  next: AvailabilityIncident,
): AvailabilityIncident => ({
  id: next.id,
  title: next.title || prev.title,
  impact: next.impact === "unknown" ? prev.impact : next.impact,
  affectedProducts: uniqueSorted([
    ...prev.affectedProducts,
    ...next.affectedProducts,
  ]),
  startedAt:
    (parseMs(prev.startedAt) ?? Infinity) <=
    (parseMs(next.startedAt) ?? Infinity)
      ? prev.startedAt
      : next.startedAt,
  endedAt: next.endedAt ?? prev.endedAt,
  reportedUptimePct: next.reportedUptimePct ?? prev.reportedUptimePct,
  sourceUrl: next.sourceUrl ?? prev.sourceUrl,
});

// Merge a fresh extraction into the accumulated incident list, keyed by id.
export const mergeIncidents = (
  existing: ReadonlyArray<AvailabilityIncident>,
  incoming: ReadonlyArray<AvailabilityIncident>,
): AvailabilityIncident[] => {
  const byId = new Map<string, AvailabilityIncident>();
  for (const incident of existing) byId.set(incident.id, incident);
  for (const incident of incoming) {
    const prev = byId.get(incident.id);
    byId.set(incident.id, prev ? reconcileIncident(prev, incident) : incident);
  }
  return [...byId.values()].sort(byStartedDesc);
};

export type DayPoint = Readonly<{
  date: string;
  downtimeMinutes: number;
  uptimePct: number;
}>;

export type AvailabilityWindow = Readonly<{
  days: number;
  startedAt: string;
  endedAt: string;
  windowMinutes: number;
  downtimeMinutes: number;
  maintenanceMinutes: number;
  uptimePct: number;
  incidentCount: number;
  majorIncidentCount: number;
  perDay: ReadonlyArray<DayPoint>;
}>;

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

// Derive a trend window over the last `days` calendar days ending on the record's
// committed `asOf`. Pure and deterministic: uptime is 1 - weighted-downtime /
// window, computed per UTC calendar day so a chart can render the series.
export const computeAvailabilityWindow = (
  record: ProviderAvailabilityRecord,
  days: number,
): AvailabilityWindow => {
  const asOfMs = parseMs(record.asOf) ?? 0;
  const lastDayStart = Math.floor(asOfMs / DAY_MS) * DAY_MS;
  const firstDayStart = lastDayStart - (days - 1) * DAY_MS;

  const perDay: DayPoint[] = [];
  let downtimeMinutes = 0;
  let maintenanceMinutes = 0;
  for (let d = 0; d < days; d += 1) {
    const dayStart = firstDayStart + d * DAY_MS;
    const dayEnd = Math.min(dayStart + DAY_MS, asOfMs);
    let dayDowntime = 0;
    for (const incident of record.incidents) {
      const startMs = parseMs(incident.startedAt);
      if (startMs === null) continue;
      // Clamp the counted end so no single incident contributes more than the
      // per-incident cap toward the index (see MAX_COUNTED_INCIDENT_MS).
      const realEndMs = parseMs(incident.endedAt) ?? asOfMs;
      const endMs = Math.min(realEndMs, startMs + MAX_COUNTED_INCIDENT_MS);
      const minutes = overlapMinutes(startMs, endMs, dayStart, dayEnd);
      if (minutes === 0) continue;
      if (incident.impact === "maintenance") {
        maintenanceMinutes += minutes;
      } else {
        dayDowntime += minutes * impactDowntimeWeight(incident.impact);
      }
    }
    downtimeMinutes += dayDowntime;
    perDay.push({
      date: new Date(dayStart).toISOString().slice(0, 10),
      downtimeMinutes: round(dayDowntime, 1),
      uptimePct: round(Math.max(0, 1 - dayDowntime / DAY_MINUTES), 5),
    });
  }

  const windowStartMs = firstDayStart;
  const overlapping = record.incidents.filter((incident) => {
    const startMs = parseMs(incident.startedAt);
    if (startMs === null) return false;
    const endMs = parseMs(incident.endedAt) ?? asOfMs;
    return (
      incident.impact !== "maintenance" &&
      overlapMinutes(startMs, endMs, windowStartMs, asOfMs) > 0
    );
  });
  const windowMinutes = days * DAY_MINUTES;
  return {
    days,
    startedAt: new Date(firstDayStart).toISOString(),
    endedAt: record.asOf,
    windowMinutes,
    downtimeMinutes: round(downtimeMinutes, 1),
    maintenanceMinutes: round(maintenanceMinutes, 1),
    uptimePct: round(Math.max(0, 1 - downtimeMinutes / windowMinutes), 5),
    incidentCount: overlapping.length,
    majorIncidentCount: overlapping.filter(
      (incident) =>
        incident.impact === "major" || incident.impact === "critical",
    ).length,
    perDay,
  };
};

export type ProviderAvailabilityTrend = Readonly<{
  provider: Provider;
  providerName: string;
  sourceUrl: string;
  sourceKind: string;
  available: boolean;
  note: string | null;
  asOf: string;
  lastFetchedAt: string;
  extraction: ProviderAvailabilityRecord["extraction"];
  incidentTotal: number;
  window30: AvailabilityWindow;
  window90: AvailabilityWindow;
}>;

export const summarizeTrend = (
  record: ProviderAvailabilityRecord,
): ProviderAvailabilityTrend => ({
  provider: record.provider,
  providerName: record.providerName,
  sourceUrl: record.sourceUrl,
  sourceKind: record.sourceKind,
  available: record.available,
  note: record.note,
  asOf: record.asOf,
  lastFetchedAt: record.lastFetchedAt,
  extraction: record.extraction,
  incidentTotal: record.incidents.length,
  window30: computeAvailabilityWindow(record, 30),
  window90: computeAvailabilityWindow(record, 90),
});

// The most recent incidents (for a report's history section), newest first.
export const recentIncidents = (
  record: ProviderAvailabilityRecord,
  limit: number,
): ReadonlyArray<AvailabilityIncident> =>
  [...record.incidents].sort(byStartedDesc).slice(0, limit);
