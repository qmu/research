import { renderTimeSeriesChart } from "../../research-report/domain/chart.js";
import type {
  AvailabilityIncident,
  AvailabilityWindow,
  ProviderAvailabilityTrend,
} from "./availability";
import type { Provider } from "./types";

export type AvailabilityReportRecent = Readonly<{
  provider: Provider;
  providerName: string;
  incidents: ReadonlyArray<AvailabilityIncident>;
}>;

export type AvailabilityRunReport = Readonly<{
  generatedAt: string;
  fixture: boolean;
  asOf: string;
  trends: ReadonlyArray<ProviderAvailabilityTrend>;
  recent: ReadonlyArray<AvailabilityReportRecent>;
  artifactPath: string;
}>;

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const orDash = (text: string | null): string =>
  text === null || text.length === 0 ? "—" : escapeCell(text);

const pct = (value: number): string => `${(value * 100).toFixed(3)}%`;
const hours = (minutes: number): string => `${(minutes / 60).toFixed(1)} h`;

const trendRow = (
  trend: ProviderAvailabilityTrend,
  window: AvailabilityWindow,
): string => {
  if (!trend.available) {
    return `| ${escapeCell(trend.providerName)} | not retrievable | — | — | — | — |`;
  }
  return (
    `| ${escapeCell(trend.providerName)} | ${pct(window.uptimePct)} | ` +
    `${window.incidentCount} | ${window.majorIncidentCount} | ` +
    `${hours(window.downtimeMinutes)} | ${hours(window.maintenanceMinutes)} |`
  );
};

const trendTable = (
  trends: ReadonlyArray<ProviderAvailabilityTrend>,
  pick: (t: ProviderAvailabilityTrend) => AvailabilityWindow,
): string => {
  const header =
    "| Provider | Derived uptime | Incidents | Major/critical | Downtime | Maintenance |\n" +
    "| -------- | -------------- | --------- | -------------- | -------- | ----------- |";
  const rows = trends.map((trend) => trendRow(trend, pick(trend)));
  return `${header}\n${rows.join("\n")}`;
};

const uptimeChart = (
  trends: ReadonlyArray<ProviderAvailabilityTrend>,
): string => {
  const series = trends
    .filter((trend) => trend.available)
    .map((trend) => ({
      id: trend.provider,
      label: trend.providerName,
      points: trend.window90.perDay.map((p) => ({
        measuredAt: p.date,
        value: p.uptimePct,
        n: 1,
      })),
    }))
    .filter((s) => s.points.length > 0);
  if (series.length === 0) {
    return "No retrievable provider history to chart.";
  }
  return renderTimeSeriesChart({
    id: "llm-availability-90d-uptime",
    title: "LLM provider derived daily uptime (last 90 days)",
    description:
      "Daily uptime derived from each provider's own reported incidents, weighted by impact. Not an SLA or a ranking.",
    xLabel: "Date",
    yLabel: "Uptime",
    valueDigits: 4,
    series,
  });
};

const incidentLine = (
  providerName: string,
  incident: AvailabilityIncident,
): string => {
  const products =
    incident.affectedProducts.length === 0
      ? ""
      : ` — ${escapeCell(incident.affectedProducts.join(", "))}`;
  // Only linkify absolute URLs; some sources give relative incident refs
  // (e.g. Google's "incidents/…"), which are not resolvable links here.
  const link =
    incident.sourceUrl !== null && /^https?:\/\//.test(incident.sourceUrl)
      ? ` [details](${incident.sourceUrl})`
      : "";
  return (
    `- **${escapeCell(providerName)}** — ${escapeCell(incident.title)} ` +
    `[impact: ${incident.impact}] (${orDash(incident.startedAt)} → ` +
    `${incident.endedAt === null ? "ongoing" : escapeCell(incident.endedAt)})${products}${link}`
  );
};

const recentSection = (
  recent: ReadonlyArray<AvailabilityReportRecent>,
): string => {
  const blocks = recent.map((entry) => {
    if (entry.incidents.length === 0) {
      return `- **${escapeCell(entry.providerName)}**: no incidents recorded in the accumulated history.`;
    }
    return entry.incidents
      .map((incident) => incidentLine(entry.providerName, incident))
      .join("\n");
  });
  return blocks.join("\n");
};

const provenanceTable = (
  trends: ReadonlyArray<ProviderAvailabilityTrend>,
): string => {
  const header =
    "| Provider | Source | Format | As of | Incidents recorded | Extraction model | Retrieval |\n" +
    "| -------- | ------ | ------ | ----- | ------------------ | ---------------- | --------- |";
  const rows = trends.map(
    (t) =>
      `| ${escapeCell(t.providerName)} | [\`${escapeCell(t.sourceUrl)}\`](${t.sourceUrl}) | ` +
      `${t.sourceKind} | ${t.asOf} | ${t.incidentTotal} | ` +
      `${orDash(t.extraction?.model ?? null)} | ${t.available ? "ok" : `failed: ${orDash(t.note)}`} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

export const renderAvailabilityReport = (
  report: AvailabilityRunReport,
): string => `---
title: LLM provider availability — status-page history and 30/90-day trends
description: A longitudinal record built from each LLM provider's own public status-page incident history, with 30-day and 90-day derived uptime trends. Not an SLA or ranking.
---

# LLM provider availability — status-page history and 30/90-day trends

This report is a **longitudinal record** of each provider's availability, built from
**their own public status-page incident history**. An LLM reads each provider's
status page (whose formats diverge) and normalizes the incidents into one schema
that **accumulates** in this repository; the uptime figures below are **derived
from those reported incidents**, weighted by each incident's impact. We make no API
calls to the providers' models and record no measurements of our own.

> **Not an SLA or a ranking.** Derived uptime is a weighted **index** over what
> each provider reported about itself, over a rolling window — not a service
> guarantee or a "most reliable provider" claim. Providers are listed
> alphabetically. Weighting: critical outage ×1.0, major ×0.5, minor ×0.1;
> planned maintenance is excluded and reported separately. Because status pages
> log incidents at very different scopes, a single incident counts toward the
> index for at most **24 hours** — its full duration is preserved in the incident
> record below, but one long, product-scoped event cannot dominate the index.

Source: ${report.fixture ? "committed accumulated history (keyless, deterministic render)" : "live status-page fetch + LLM extraction (this run updated the history)"}

As of: \`${report.asOf}\`

## 1. Last 30 days

${trendTable(report.trends, (t) => t.window30)}

## 2. Last 90 days

${trendTable(report.trends, (t) => t.window90)}

## 3. Daily uptime trend (90 days)

${uptimeChart(report.trends)}

## 4. Recent incident history

Most recent incidents from the accumulated per-provider record.

${recentSection(report.recent)}

## 5. Provenance

Each provider's record traces to its public status source, the fetch cutoff
(\`as of\`), and the model that extracted it.

${provenanceTable(report.trends)}

## Artifact

The computed trends are in
[\`${escapeCell(report.artifactPath)}\`](./${escapeCell(report.artifactPath)}); the
accumulated per-provider incident history is committed under
\`docs/research-reports/availability-history/\`.
`;
