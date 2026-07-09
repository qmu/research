import { readFile } from "node:fs/promises";
import type { StatusObservation } from "../../llm-model-comparison/domain/availability";
import { normalizeGoogleIncidents } from "./google";
import {
  normalizeStatuspageSummary,
  type StatusSourceMeta,
} from "./statuspage";

// The `vendors/status/` anti-corruption boundary: it knows the providers' public
// status endpoints and their formats, fetches them (no API keys), and hands the
// domain normalized StatusObservations. A fetch/parse failure is captured as an
// honest `fetchOk: false` observation, never a fabricated status.

export type StatusFetch = (url: string) => Promise<unknown>;

type StatusAdapter = (
  source: StatusSourceMeta,
  raw: unknown,
  fetchedAt: string,
) => StatusObservation;

export type StatusSource = StatusSourceMeta &
  Readonly<{
    kind: "statuspage" | "google";
    fixtureFile: string;
    adapter: StatusAdapter;
  }>;

// Providers in alphabetical order — the report presents them so, with no ranking.
export const STATUS_SOURCES: ReadonlyArray<StatusSource> = [
  {
    provider: "anthropic",
    providerName: "Anthropic",
    url: "https://status.anthropic.com/api/v2/summary.json",
    kind: "statuspage",
    fixtureFile: "anthropic.json",
    adapter: normalizeStatuspageSummary,
  },
  {
    provider: "google",
    providerName: "Google Cloud",
    url: "https://status.cloud.google.com/incidents.json",
    kind: "google",
    fixtureFile: "google.json",
    adapter: normalizeGoogleIncidents,
  },
  {
    provider: "openai",
    providerName: "OpenAI",
    url: "https://status.openai.com/api/v2/summary.json",
    kind: "statuspage",
    fixtureFile: "openai.json",
    adapter: normalizeStatuspageSummary,
  },
  {
    provider: "xai",
    providerName: "xAI",
    url: "https://status.x.ai/api/v2/summary.json",
    kind: "statuspage",
    fixtureFile: "xai.json",
    adapter: normalizeStatuspageSummary,
  },
];

const failedObservation = (
  source: StatusSource,
  fetchedAt: string,
  error: unknown,
): StatusObservation => ({
  provider: source.provider,
  providerName: source.providerName,
  sourceUrl: source.url,
  fetchedAt,
  pageUpdatedAt: null,
  fetchOk: false,
  fetchError: error instanceof Error ? error.message : String(error),
  overallDescription: null,
  overallIndicator: null,
  components: [],
  activeIncidents: [],
  recentIncidents: [],
});

export const fetchStatusObservation = async (
  source: StatusSource,
  fetchJson: StatusFetch,
  fetchedAt: string,
): Promise<StatusObservation> => {
  try {
    const raw = await fetchJson(source.url);
    return source.adapter(source, raw, fetchedAt);
  } catch (error: unknown) {
    return failedObservation(source, fetchedAt, error);
  }
};

export const observeAllStatus = (
  fetchJson: StatusFetch,
  fetchedAt: string,
): Promise<ReadonlyArray<StatusObservation>> =>
  Promise.all(
    STATUS_SOURCES.map((source) =>
      fetchStatusObservation(source, fetchJson, fetchedAt),
    ),
  );

// Live network fetch with a hard timeout. No credentials — these are public
// status pages. Non-2xx and timeout both surface as thrown errors, which
// `fetchStatusObservation` records as an honest fetch failure.
export const liveStatusFetch =
  (timeoutMs: number): StatusFetch =>
  async (url) => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText} from ${url}`,
        );
      }
      return (await response.json()) as unknown;
    } catch (error: unknown) {
      if (timedOut) {
        throw new Error(`status fetch timed out after ${timeoutMs}ms: ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

const FIXTURE_DIR = new URL("./fixtures/", import.meta.url);

// Reads the committed status responses instead of the network — the keyless,
// deterministic path exercised by `--fixture` and by CI. It runs the same
// adapters as the live path, so the fixtures test normalization too.
export const fixtureStatusFetch: StatusFetch = async (url) => {
  const source = STATUS_SOURCES.find((item) => item.url === url);
  if (source === undefined) {
    throw new Error(`no committed status fixture for ${url}`);
  }
  const text = await readFile(new URL(source.fixtureFile, FIXTURE_DIR), "utf8");
  return JSON.parse(text) as unknown;
};
