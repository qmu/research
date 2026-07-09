import {
  INCIDENT_IMPACTS,
  type AvailabilityIncident,
  type IncidentImpact,
  type StatusSourceKind,
} from "./availability";
import type { Provider } from "./types";

// Pure helpers for the LLM extraction stage: reduce a raw status page to a
// readable, token-bounded form; build the extraction prompt; and tolerantly parse
// the model's JSON back into normalized incidents. Deterministic parsing is NOT
// the normalizer here (provider formats drift and break) — the LLM reads the
// content; these helpers only prepare its input and validate its output.

const MAX_CHARS = 120_000;
const MAX_INCIDENTS = 150;

type Rec = Record<string, unknown>;

const asRec = (value: unknown): Rec =>
  typeof value === "object" && value !== null ? (value as Rec) : {};
const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;
const arr = (value: unknown): ReadonlyArray<unknown> =>
  Array.isArray(value) ? value : [];

const slimStatuspage = (parsed: unknown): unknown => {
  const incidents = arr(asRec(parsed).incidents).slice(0, MAX_INCIDENTS);
  return incidents.map((raw) => {
    const i = asRec(raw);
    return {
      id: str(i.id),
      name: str(i.name),
      impact: str(i.impact),
      status: str(i.status),
      started_at: str(i.started_at) ?? str(i.created_at),
      resolved_at: str(i.resolved_at),
      updated_at: str(i.updated_at),
      components: arr(i.components)
        .map((c) => str(asRec(c).name))
        .filter(Boolean),
      latest_update: str(asRec(arr(i.incident_updates)[0]).body),
      shortlink: str(i.shortlink),
    };
  });
};

const slimGoogle = (parsed: unknown): unknown =>
  arr(parsed)
    .slice(0, MAX_INCIDENTS)
    .map((raw) => {
      const i = asRec(raw);
      return {
        id: str(i.id) ?? str(i.number),
        external_desc: str(i.external_desc),
        status_impact: str(i.status_impact),
        severity: str(i.severity),
        begin: str(i.begin),
        end: str(i.end),
        affected_products: arr(i.affected_products)
          .map((p) => str(asRec(p).title))
          .filter(Boolean),
        uri: str(i.uri),
        most_recent_update: str(asRec(i.most_recent_update).text),
      };
    });

const stripHtml = (body: string): string =>
  body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Reduce a raw status body to a readable, size-bounded form for the model. JSON
// feeds are slimmed to the fields that describe incidents (dropping verbose
// update logs); HTML is stripped to visible text. On any parse failure it falls
// back to the truncated raw body so the model still has something to read.
export const readableStatusText = (
  body: string,
  kind: StatusSourceKind,
  maxChars = MAX_CHARS,
): string => {
  if (kind === "html") return stripHtml(body).slice(0, maxChars);
  try {
    const parsed = JSON.parse(body) as unknown;
    const slim =
      kind === "google-json" ? slimGoogle(parsed) : slimStatuspage(parsed);
    return JSON.stringify(slim).slice(0, maxChars);
  } catch {
    return body.slice(0, maxChars);
  }
};

export const buildExtractionPrompt = (
  providerName: string,
  provider: Provider,
  kind: StatusSourceKind,
  readable: string,
  asOf: string,
): string =>
  `You are reading the PUBLIC status page of ${providerName} (provider key: ${provider}). ` +
  `The content below is in "${kind}" form. Extract EVERY incident and scheduled ` +
  `maintenance you can find in it.\n\n` +
  `Return STRICT JSON only — no prose, no markdown fences — as an object:\n` +
  `{"incidents":[{...}]}\n\n` +
  `Each incident object has these fields:\n` +
  `- id: the provider's own incident id if present in the content, else omit it\n` +
  `- title: a short incident title\n` +
  `- impact: exactly one of "none","minor","major","critical","maintenance" ` +
  `(map the provider's own severity; scheduled maintenance = "maintenance"; if ` +
  `genuinely unclear use "minor")\n` +
  `- affectedProducts: array of affected product/component names as strings ([] if none named)\n` +
  `- startedAt: ISO 8601 UTC start time (e.g. "2026-07-08T00:00:00.000Z")\n` +
  `- endedAt: ISO 8601 UTC resolution time, or null if still ongoing/unresolved\n` +
  `- reportedUptimePct: a number 0-100 ONLY if the page explicitly states an uptime ` +
  `percentage, else null\n` +
  `- sourceUrl: the canonical incident URL if present, else null\n\n` +
  `Rules: report ONLY what the page states — never invent incidents, products, or ` +
  `times. Every timestamp must be UTC ISO 8601. As of ${asOf}, any incident without ` +
  `a resolution time is ongoing (endedAt: null). Output ONLY the JSON object.\n\n` +
  `--- STATUS PAGE CONTENT (${kind}) ---\n${readable}\n--- END CONTENT ---`;

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "incident";

const toImpact = (value: unknown): IncidentImpact => {
  const lower = typeof value === "string" ? value.toLowerCase() : "";
  return (INCIDENT_IMPACTS as ReadonlyArray<string>).includes(lower)
    ? (lower as IncidentImpact)
    : "unknown";
};

const toIso = (value: unknown): string | null => {
  const s = str(value);
  if (s === undefined) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

const toProducts = (value: unknown): string[] =>
  arr(value)
    .map((p) => str(p))
    .filter((p): p is string => p !== undefined);

const toUptime = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// Extract the JSON object from the model's answer, tolerating markdown fences or
// surrounding prose by falling back to the outermost {...} span.
const extractJson = (text: string): unknown => {
  const fenced = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(fenced);
  } catch {
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(fenced.slice(start, end + 1));
    }
    throw new Error("no JSON object found in extraction output");
  }
};

// Parse and normalize the model's answer into validated incidents. Incidents
// without a usable title or start time are dropped (not fabricated). Ids are the
// provider's when given, otherwise a deterministic slug so merges are stable.
export const parseExtraction = (
  answer: string,
  provider: Provider,
): AvailabilityIncident[] => {
  const parsed = asRec(extractJson(answer));
  const incidents = arr(parsed.incidents);
  const out: AvailabilityIncident[] = [];
  for (const raw of incidents) {
    const i = asRec(raw);
    const title = str(i.title);
    const startedAt = toIso(i.startedAt);
    if (title === undefined || startedAt === null) continue;
    const id = str(i.id) ?? `${provider}:${startedAt}:${slugify(title)}`;
    out.push({
      id,
      title,
      impact: toImpact(i.impact),
      affectedProducts: toProducts(i.affectedProducts),
      startedAt,
      endedAt: toIso(i.endedAt),
      reportedUptimePct: toUptime(i.reportedUptimePct),
      sourceUrl: str(i.sourceUrl) ?? null,
    });
  }
  return out;
};
