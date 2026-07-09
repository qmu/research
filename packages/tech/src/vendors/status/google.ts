import type {
  IncidentImpact,
  StatusIncident,
  StatusObservation,
} from "../../llm-model-comparison/domain/availability";
import type { StatusSourceMeta } from "./statuspage";

// Anti-corruption adapter for Google Cloud's `incidents.json`, whose schema
// differs from Statuspage: it is a flat array of incidents with no page-level
// component list. We record the incidents (active vs. ended) and leave
// `components` empty and `pageUpdatedAt` null, honestly reflecting that this
// source does not expose a per-component snapshot — no fabrication.

const RECENT_LIMIT = 8;

type RawGoogleIncident = Readonly<{
  external_desc?: unknown;
  begin?: unknown;
  end?: unknown;
  uri?: unknown;
  status_impact?: unknown;
  most_recent_update?: { status?: unknown };
}>;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const IMPACT_MAP: Readonly<Record<string, IncidentImpact>> = {
  SERVICE_OUTAGE: "critical",
  SERVICE_DISRUPTION: "major",
  SERVICE_INFORMATION: "minor",
};

const toImpact = (value: unknown): IncidentImpact =>
  typeof value === "string" && value in IMPACT_MAP
    ? IMPACT_MAP[value]
    : "unknown";

const toIncident = (raw: RawGoogleIncident): StatusIncident => {
  const end = str(raw.end);
  const uri = str(raw.uri);
  return {
    name: str(raw.external_desc) ?? "(unnamed incident)",
    impact: toImpact(raw.status_impact),
    status:
      str(raw.most_recent_update?.status) ??
      (end !== null ? "resolved" : "ongoing"),
    startedAt: str(raw.begin),
    resolvedAt: end,
    url: uri === null ? null : `https://status.cloud.google.com/${uri}`,
  };
};

const byStartedThenName = (a: StatusIncident, b: StatusIncident): number =>
  (b.startedAt ?? "").localeCompare(a.startedAt ?? "") ||
  a.name.localeCompare(b.name);

export const normalizeGoogleIncidents = (
  source: StatusSourceMeta,
  raw: unknown,
  fetchedAt: string,
): StatusObservation => {
  const incidents = (Array.isArray(raw) ? raw : []).filter(
    (item): item is RawGoogleIncident =>
      typeof item === "object" && item !== null,
  );
  const active: StatusIncident[] = [];
  const recent: StatusIncident[] = [];
  for (const raw of incidents) {
    const incident = toIncident(raw);
    (incident.resolvedAt === null ? active : recent).push(incident);
  }
  return {
    provider: source.provider,
    providerName: source.providerName,
    sourceUrl: source.url,
    fetchedAt,
    pageUpdatedAt: null,
    fetchOk: true,
    fetchError: null,
    overallDescription:
      active.length === 0 ? "No active incidents reported" : null,
    overallIndicator: null,
    components: [],
    activeIncidents: active.sort(byStartedThenName),
    recentIncidents: recent.sort(byStartedThenName).slice(0, RECENT_LIMIT),
  };
};
