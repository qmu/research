import type { Provider } from "./types";

// Availability here is a PASSIVE OBSERVATION of each provider's own public
// status page, not an active measurement we perform. We record what the
// provider reports about its own components and incidents, with provenance, and
// never turn that into an assertive availability ranking or SLA. The types
// below are the normalized vocabulary the `vendors/status/` adapters produce and
// the domain summarizes.

// The Statuspage component states, plus a normalized "unknown" for values an
// adapter cannot map. Kept as a closed union so the report and tally are total.
export type ComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance"
  | "unknown";

export const COMPONENT_STATUSES: ReadonlyArray<ComponentStatus> = [
  "operational",
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
  "unknown",
];

export type StatusComponent = Readonly<{
  name: string;
  status: ComponentStatus;
}>;

// The incident impact levels a status page reports. "maintenance" folds in
// scheduled maintenance so a report can list both together; "unknown" covers
// values an adapter cannot map.
export type IncidentImpact =
  | "none"
  | "minor"
  | "major"
  | "critical"
  | "maintenance"
  | "unknown";

export type StatusIncident = Readonly<{
  name: string;
  impact: IncidentImpact;
  // The provider's own lifecycle label (e.g. "investigating", "monitoring",
  // "resolved", "scheduled") — recorded verbatim, not interpreted.
  status: string;
  startedAt: string | null;
  resolvedAt: string | null;
  url: string | null;
}>;

// One provider's status-page snapshot, with the provenance the objective-
// documentation policy requires: where it came from, when we fetched it, and
// when the page itself last changed. `fetchOk: false` records an honest failure
// (network, timeout, unparseable) rather than fabricating a status.
export type StatusObservation = Readonly<{
  provider: Provider;
  providerName: string;
  sourceUrl: string;
  fetchedAt: string;
  pageUpdatedAt: string | null;
  fetchOk: boolean;
  fetchError: string | null;
  // The page's own top-line, e.g. "All Systems Operational" — recorded as
  // reported, null when the source has no such field.
  overallDescription: string | null;
  overallIndicator: string | null;
  components: ReadonlyArray<StatusComponent>;
  activeIncidents: ReadonlyArray<StatusIncident>;
  recentIncidents: ReadonlyArray<StatusIncident>;
}>;

export type ComponentStatusTally = Readonly<Record<ComponentStatus, number>>;

// The per-provider summary the report and exporter read. Every field is derived
// deterministically from a single StatusObservation; no cross-provider ranking.
export type AvailabilityObservationSummary = Readonly<{
  provider: Provider;
  providerName: string;
  sourceUrl: string;
  fetchedAt: string;
  pageUpdatedAt: string | null;
  fetchOk: boolean;
  fetchError: string | null;
  overallDescription: string | null;
  overallIndicator: string | null;
  componentCount: number;
  statusTally: ComponentStatusTally;
  operationalCount: number;
  nonOperationalComponents: ReadonlyArray<StatusComponent>;
  activeIncidentCount: number;
  recentIncidentCount: number;
}>;

export const emptyStatusTally = (): Record<ComponentStatus, number> => ({
  operational: 0,
  degraded_performance: 0,
  partial_outage: 0,
  major_outage: 0,
  under_maintenance: 0,
  unknown: 0,
});

export const tallyComponentStatuses = (
  components: ReadonlyArray<StatusComponent>,
): ComponentStatusTally => {
  const tally = emptyStatusTally();
  for (const component of components) {
    tally[component.status] += 1;
  }
  return tally;
};

const byNameThenStatus = (a: StatusComponent, b: StatusComponent): number =>
  a.name.localeCompare(b.name) || a.status.localeCompare(b.status);

export const summarizeStatusObservation = (
  observation: StatusObservation,
): AvailabilityObservationSummary => {
  const statusTally = tallyComponentStatuses(observation.components);
  const nonOperationalComponents = observation.components
    .filter((component) => component.status !== "operational")
    .sort(byNameThenStatus);
  return {
    provider: observation.provider,
    providerName: observation.providerName,
    sourceUrl: observation.sourceUrl,
    fetchedAt: observation.fetchedAt,
    pageUpdatedAt: observation.pageUpdatedAt,
    fetchOk: observation.fetchOk,
    fetchError: observation.fetchError,
    overallDescription: observation.overallDescription,
    overallIndicator: observation.overallIndicator,
    componentCount: observation.components.length,
    statusTally,
    operationalCount: statusTally.operational,
    nonOperationalComponents,
    activeIncidentCount: observation.activeIncidents.length,
    recentIncidentCount: observation.recentIncidents.length,
  };
};

export const summarizeObservations = (
  observations: ReadonlyArray<StatusObservation>,
): ReadonlyArray<AvailabilityObservationSummary> =>
  observations.map(summarizeStatusObservation);
