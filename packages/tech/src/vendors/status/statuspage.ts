import type {
  ComponentStatus,
  IncidentImpact,
  StatusComponent,
  StatusIncident,
  StatusObservation,
} from "../../llm-model-comparison/domain/availability";
import type { Provider } from "../../llm-model-comparison/domain/types";

// Anti-corruption adapter for Atlassian Statuspage's public `/api/v2/summary.json`
// schema. It maps the provider's raw JSON into the domain's normalized
// StatusObservation vocabulary so nothing outside this file depends on the
// external shape. Every field is read defensively; anything unmappable becomes
// "unknown" rather than throwing, and the source is recorded as provenance.

export type StatusSourceMeta = Readonly<{
  provider: Provider;
  providerName: string;
  url: string;
}>;

type RawComponent = Readonly<{
  name?: unknown;
  status?: unknown;
  group?: unknown;
}>;

type RawIncident = Readonly<{
  name?: unknown;
  impact?: unknown;
  status?: unknown;
  started_at?: unknown;
  created_at?: unknown;
  resolved_at?: unknown;
  scheduled_for?: unknown;
  scheduled_until?: unknown;
  shortlink?: unknown;
}>;

type RawSummary = Readonly<{
  page?: { updated_at?: unknown };
  status?: { indicator?: unknown; description?: unknown };
  components?: unknown;
  incidents?: unknown;
  scheduled_maintenances?: unknown;
}>;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const COMPONENT_STATUS_MAP: Readonly<Record<string, ComponentStatus>> = {
  operational: "operational",
  degraded_performance: "degraded_performance",
  partial_outage: "partial_outage",
  major_outage: "major_outage",
  under_maintenance: "under_maintenance",
};

const toComponentStatus = (value: unknown): ComponentStatus =>
  typeof value === "string" && value in COMPONENT_STATUS_MAP
    ? COMPONENT_STATUS_MAP[value]
    : "unknown";

const IMPACT_MAP: Readonly<Record<string, IncidentImpact>> = {
  none: "none",
  minor: "minor",
  major: "major",
  critical: "critical",
  maintenance: "maintenance",
};

const toImpact = (value: unknown): IncidentImpact =>
  typeof value === "string" && value in IMPACT_MAP
    ? IMPACT_MAP[value]
    : "unknown";

const byNameThenStatus = (a: StatusComponent, b: StatusComponent): number =>
  a.name.localeCompare(b.name) || a.status.localeCompare(b.status);

const byStartedThenName = (a: StatusIncident, b: StatusIncident): number =>
  (b.startedAt ?? "").localeCompare(a.startedAt ?? "") ||
  a.name.localeCompare(b.name);

const normalizeComponents = (raw: unknown): StatusComponent[] => {
  if (!Array.isArray(raw)) return [];
  return (
    raw
      .filter(
        (item): item is RawComponent =>
          typeof item === "object" && item !== null,
      )
      // Skip Statuspage group containers (group: true); count only leaf components.
      .filter((item) => item.group !== true)
      .map((item) => ({
        name: str(item.name) ?? "(unnamed)",
        status: toComponentStatus(item.status),
      }))
      .sort(byNameThenStatus)
  );
};

const toIncident = (
  raw: RawIncident,
  maintenance: boolean,
): StatusIncident => ({
  name: str(raw.name) ?? "(unnamed incident)",
  impact: maintenance ? "maintenance" : toImpact(raw.impact),
  status: str(raw.status) ?? "unknown",
  startedAt:
    str(raw.started_at) ?? str(raw.scheduled_for) ?? str(raw.created_at),
  resolvedAt: str(raw.resolved_at) ?? str(raw.scheduled_until),
  url: str(raw.shortlink),
});

const isResolved = (raw: RawIncident): boolean => {
  const status = str(raw.status);
  return (
    status === "resolved" ||
    status === "completed" ||
    str(raw.resolved_at) !== null
  );
};

const normalizeIncidents = (
  incidents: unknown,
  maintenances: unknown,
): { active: StatusIncident[]; recent: StatusIncident[] } => {
  const raws: ReadonlyArray<{ raw: RawIncident; maintenance: boolean }> = [
    ...(Array.isArray(incidents) ? incidents : []).map((raw) => ({
      raw: raw as RawIncident,
      maintenance: false,
    })),
    ...(Array.isArray(maintenances) ? maintenances : []).map((raw) => ({
      raw: raw as RawIncident,
      maintenance: true,
    })),
  ].filter((item) => typeof item.raw === "object" && item.raw !== null);

  const active: StatusIncident[] = [];
  const recent: StatusIncident[] = [];
  for (const { raw, maintenance } of raws) {
    const incident = toIncident(raw, maintenance);
    (isResolved(raw) ? recent : active).push(incident);
  }
  return {
    active: active.sort(byStartedThenName),
    recent: recent.sort(byStartedThenName),
  };
};

export const normalizeStatuspageSummary = (
  source: StatusSourceMeta,
  raw: unknown,
  fetchedAt: string,
): StatusObservation => {
  const summary = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as RawSummary;
  const { active, recent } = normalizeIncidents(
    summary.incidents,
    summary.scheduled_maintenances,
  );
  return {
    provider: source.provider,
    providerName: source.providerName,
    sourceUrl: source.url,
    fetchedAt,
    pageUpdatedAt: str(summary.page?.updated_at),
    fetchOk: true,
    fetchError: null,
    overallDescription: str(summary.status?.description),
    overallIndicator: str(summary.status?.indicator),
    components: normalizeComponents(summary.components),
    activeIncidents: active,
    recentIncidents: recent,
  };
};
