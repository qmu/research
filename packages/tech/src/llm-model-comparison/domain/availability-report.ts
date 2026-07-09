import type {
  AvailabilityObservationSummary,
  StatusIncident,
  StatusObservation,
} from "./availability";

export type AvailabilityRunReport = Readonly<{
  generatedAt: string;
  fixture: boolean;
  observations: ReadonlyArray<StatusObservation>;
  summaries: ReadonlyArray<AvailabilityObservationSummary>;
  artifactPath: string;
}>;

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const orDash = (text: string | null): string =>
  text === null || text.length === 0 ? "—" : escapeCell(text);

const overallReported = (summary: AvailabilityObservationSummary): string => {
  if (!summary.fetchOk) return "fetch failed";
  if (summary.overallDescription !== null) return summary.overallDescription;
  return summary.activeIncidentCount === 0
    ? "no active incidents reported"
    : "active incident(s) reported";
};

const componentsCell = (summary: AvailabilityObservationSummary): string => {
  if (!summary.fetchOk) return "—";
  if (summary.componentCount === 0) return "not exposed by source";
  return `${summary.operationalCount}/${summary.componentCount} operational`;
};

const overallTable = (
  summaries: ReadonlyArray<AvailabilityObservationSummary>,
): string => {
  const header =
    "| Provider | Reported status | Components | Active incidents | Recent incidents | Page updated |\n" +
    "| -------- | --------------- | ---------- | ---------------- | ---------------- | ------------ |";
  const rows = summaries.map(
    (s) =>
      `| ${escapeCell(s.providerName)} | ${escapeCell(overallReported(s))} | ` +
      `${componentsCell(s)} | ${s.activeIncidentCount} | ${s.recentIncidentCount} | ` +
      `${orDash(s.pageUpdatedAt)} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const componentDetail = (
  summaries: ReadonlyArray<AvailabilityObservationSummary>,
): string =>
  summaries
    .map((s) => {
      if (!s.fetchOk) {
        return `- **${escapeCell(s.providerName)}**: status page could not be fetched (${orDash(s.fetchError)}); no component snapshot recorded.`;
      }
      if (s.componentCount === 0) {
        return `- **${escapeCell(s.providerName)}**: this source does not expose a per-component list (incidents only).`;
      }
      if (s.nonOperationalComponents.length === 0) {
        return `- **${escapeCell(s.providerName)}**: all ${s.componentCount} reported components operational.`;
      }
      const items = s.nonOperationalComponents
        .map((c) => `${escapeCell(c.name)} → ${c.status}`)
        .join("; ");
      return `- **${escapeCell(s.providerName)}**: ${s.operationalCount}/${s.componentCount} operational; not operational: ${items}.`;
    })
    .join("\n");

const incidentLine = (
  providerName: string,
  incident: StatusIncident,
): string => {
  const window =
    incident.startedAt === null && incident.resolvedAt === null
      ? ""
      : ` (${orDash(incident.startedAt)} → ${incident.resolvedAt === null ? "ongoing" : escapeCell(incident.resolvedAt)})`;
  const link = incident.url === null ? "" : ` [details](${incident.url})`;
  return `- **${escapeCell(providerName)}** — ${escapeCell(incident.name)} [impact: ${incident.impact}, status: ${escapeCell(incident.status)}]${window}${link}`;
};

const incidentSection = (
  observations: ReadonlyArray<StatusObservation>,
  select: (o: StatusObservation) => ReadonlyArray<StatusIncident>,
  emptyText: string,
): string => {
  const lines = observations.flatMap((o) =>
    select(o).map((incident) => incidentLine(o.providerName, incident)),
  );
  return lines.length === 0 ? emptyText : lines.join("\n");
};

const provenanceTable = (
  observations: ReadonlyArray<StatusObservation>,
): string => {
  const header =
    "| Provider | Source | Fetched at | Page updated | Fetch |\n" +
    "| -------- | ------ | ---------- | ------------ | ----- |";
  const rows = observations.map(
    (o) =>
      `| ${escapeCell(o.providerName)} | [\`${escapeCell(o.sourceUrl)}\`](${o.sourceUrl}) | ` +
      `${o.fetchedAt} | ${orDash(o.pageUpdatedAt)} | ${o.fetchOk ? "ok" : `failed: ${orDash(o.fetchError)}`} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

export const renderAvailabilityReport = (
  report: AvailabilityRunReport,
): string => `---
title: LLM provider status-page observation
description: A passive snapshot of each LLM provider's own public status page — reported component states and incidents, with provenance. Not an availability ranking or SLA.
---

# LLM provider status-page observation

This report **records what each provider reports on its own public status page** —
component states, active incidents, and recent incident history — at a single
fetch time. It makes **no API calls** to the providers' model endpoints and needs
no API keys. These are the providers' own reports, not our measurements.

> **This is not an availability ranking or SLA.** A status-page snapshot at one
> moment does not support assertive "which provider is more reliable" claims. It
> is presented as an observation, with the source and fetch time recorded.

Fixture: ${report.fixture ? "yes (keyless deterministic self-test over committed status responses)" : "no (live fetch of the providers' public status pages)"}

Fetched at: \`${report.generatedAt}\`

## 1. Reported status by provider

Providers are listed alphabetically; the order implies no ranking.

${overallTable(report.summaries)}

## 2. Component states

${componentDetail(report.summaries)}

## 3. Active incidents and maintenance

${incidentSection(report.observations, (o) => o.activeIncidents, "No active incidents or maintenance reported on any source at fetch time.")}

## 4. Recent incident history

Recent incidents as exposed by each source at fetch time (Statuspage \`summary.json\`
carries only currently-listed incidents; a full history would need each page's
incident feed).

${incidentSection(report.observations, (o) => o.recentIncidents, "No recent resolved incidents exposed by the fetched sources.")}

## 5. Provenance

Each observation records its source URL, our fetch time, and the page's own last
update time, so a reader can trace it to the provider's report.

${provenanceTable(report.observations)}

## Artifact

The complete normalized observations are stored in
[\`${escapeCell(report.artifactPath)}\`](./${escapeCell(report.artifactPath)}).
`;
