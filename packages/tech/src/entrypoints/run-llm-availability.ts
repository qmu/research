import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import {
  mergeIncidents,
  recentIncidents,
  summarizeTrend,
  type ProviderAvailabilityRecord,
  type ProviderAvailabilityTrend,
} from "../llm-model-comparison/domain/availability";
import {
  buildExtractionPrompt,
  parseExtraction,
  readableStatusText,
} from "../llm-model-comparison/domain/availability-extract";
import {
  renderAvailabilityReport,
  type AvailabilityReportRecent,
} from "../llm-model-comparison/domain/availability-report";
import { STATUS_SOURCES, type StatusSource } from "../vendors/status/sources";
import { fetchRawStatus } from "../vendors/status/fetch";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";

// PASSIVE, LONGITUDINAL availability observer. The real path fetches each
// provider's public status page (keyless), an LLM normalizes the divergent
// formats into one incident schema, and the result is merged into a committed
// per-provider history DB (accumulating over runs). The keyless `--fixture` path
// only renders 30/90-day trends from the committed DBs — deterministic, byte-
// stable, CI-safe. No provider model API is ever called.

type Args = Readonly<{
  fixture: boolean;
  estimateOnly: boolean;
}>;

const EXTRACTION_MODEL = "claude-sonnet-5";
const KEY_ENV = "ANTHROPIC_API_KEY";
const LIVE_TIMEOUT_MS = 15_000;
const RECENT_LIMIT = 6;
const FALLBACK_ASOF = "2026-01-01T00:00:00.000Z";

const parseArgs = (argv: ReadonlyArray<string>): Args => ({
  fixture: argv.includes("--fixture"),
  estimateOnly: argv.includes("--estimate"),
});

const historyDir = (): string =>
  resolve(process.cwd(), "../../docs/research-reports/availability-history");

const dbPath = (provider: string): string =>
  resolve(historyDir(), `${provider}.json`);

const readRecord = async (
  provider: string,
): Promise<ProviderAvailabilityRecord | null> => {
  try {
    return JSON.parse(
      await readFile(dbPath(provider), "utf8"),
    ) as ProviderAvailabilityRecord;
  } catch {
    return null;
  }
};

const writeRecord = async (
  record: ProviderAvailabilityRecord,
): Promise<void> => {
  await mkdir(historyDir(), { recursive: true });
  await writeFile(
    dbPath(record.provider),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
};

const placeholderRecord = (
  source: StatusSource,
): ProviderAvailabilityRecord => ({
  provider: source.provider,
  providerName: source.providerName,
  sourceUrl: source.url,
  sourceKind: source.kind,
  available: false,
  note: "no history recorded yet",
  lastFetchedAt: FALLBACK_ASOF,
  asOf: FALLBACK_ASOF,
  extraction: null,
  incidents: [],
});

const loadRecords = async (): Promise<ProviderAvailabilityRecord[]> =>
  Promise.all(
    STATUS_SOURCES.map(
      async (source) =>
        (await readRecord(source.provider)) ?? placeholderRecord(source),
    ),
  );

const extractRecord = async (
  source: StatusSource,
  existing: ProviderAvailabilityRecord | null,
  now: string,
  generateAnswer: (prompt: string) => Promise<string>,
): Promise<ProviderAvailabilityRecord> => {
  const raw = await fetchRawStatus(source, LIVE_TIMEOUT_MS);
  const base = {
    provider: source.provider,
    providerName: source.providerName,
    sourceUrl: source.url,
    sourceKind: source.kind,
    lastFetchedAt: now,
    asOf: now,
  } as const;
  if (!raw.ok) {
    // Keep any accumulated incidents; record this fetch as an honest failure.
    return {
      ...base,
      available: false,
      note: raw.error,
      extraction: existing?.extraction ?? null,
      incidents: existing?.incidents ?? [],
    };
  }
  const readable = readableStatusText(raw.body, source.kind);
  const prompt = buildExtractionPrompt(
    source.providerName,
    source.provider,
    source.kind,
    readable,
    now,
  );
  const answer = await generateAnswer(prompt);
  const incidents = mergeIncidents(
    existing?.incidents ?? [],
    parseExtraction(answer, source.provider),
  );
  return {
    ...base,
    available: true,
    note: null,
    extraction: { model: EXTRACTION_MODEL, extractedAt: now },
    incidents,
  };
};

const runExtraction = async (now: string): Promise<void> => {
  const key = process.env[KEY_ENV];
  if (!key) {
    throw new Error(
      `${KEY_ENV} is required for the real availability extraction path; use --fixture for the keyless render.`,
    );
  }
  const client = createAnthropicCompletionClient(EXTRACTION_MODEL, key);
  // Providers with long histories (e.g. Anthropic's ~50 incidents) need a large
  // output budget or the JSON answer is truncated and fails to parse.
  const generateAnswer = (prompt: string): Promise<string> =>
    client.complete(prompt, { maxTokens: 16_384 }).then((r) => r.text);

  for (const source of STATUS_SOURCES) {
    const existing = await readRecord(source.provider);
    try {
      const record = await extractRecord(source, existing, now, generateAnswer);
      await writeRecord(record);
      process.stdout.write(
        `[availability] ${source.provider}: ${record.available ? `${record.incidents.length} incidents recorded` : `fetch failed (${record.note})`}\n`,
      );
    } catch (error: unknown) {
      process.stderr.write(
        `[availability] ${source.provider}: extraction error: ${String(error)}\n`,
      );
    }
  }
};

const maxAsOf = (records: ReadonlyArray<ProviderAvailabilityRecord>): string =>
  records.reduce((max, r) => (r.asOf > max ? r.asOf : max), FALLBACK_ASOF);

type AvailabilityArtifact = Readonly<{
  generatedAt: string;
  method: "status-page-llm-extraction";
  fixture: boolean;
  asOf: string;
  trends: ReadonlyArray<ProviderAvailabilityTrend>;
}>;

const render = async (fixture: boolean): Promise<void> => {
  const records = await loadRecords();
  const asOf = maxAsOf(records);
  const trends = records.map(summarizeTrend);
  const recent: AvailabilityReportRecent[] = records.map((r) => ({
    provider: r.provider,
    providerName: r.providerName,
    incidents: recentIncidents(r, RECENT_LIMIT),
  }));

  const reportPath = resolve(
    process.cwd(),
    "../../docs/research-reports/llm-availability.md",
  );
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const artifact: AvailabilityArtifact = {
    generatedAt: asOf,
    method: "status-page-llm-extraction",
    fixture,
    asOf,
    trends,
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    reportPath,
    renderAvailabilityReport({
      generatedAt: asOf,
      fixture,
      asOf,
      trends,
      recent,
      artifactPath: basename(artifactPath),
    }),
    "utf8",
  );
  process.stdout.write(`wrote ${reportPath}\n`);
  process.stdout.write(`wrote ${artifactPath}\n`);
};

const printEstimate = (): void => {
  process.stdout.write(
    `Availability status-page observation: ${STATUS_SOURCES.length} public ` +
      `status pages fetched (keyless), then ${STATUS_SOURCES.length} LLM extraction ` +
      `calls (model ${EXTRACTION_MODEL}, real path only) to normalize incidents ` +
      `into the accumulating history. --fixture renders 30/90-day trends from the ` +
      `committed history with no network and no LLM. Use --estimate to make no calls.\n`,
  );
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  printEstimate();
  if (args.estimateOnly) {
    process.stdout.write("--estimate: dry run, no fetch and no LLM calls.\n");
    return;
  }
  if (!args.fixture) {
    await runExtraction(new Date().toISOString());
  }
  await render(args.fixture);
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `availability status observation failed: ${String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
