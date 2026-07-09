import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import {
  summarizeObservations,
  type AvailabilityObservationSummary,
  type StatusObservation,
} from "../llm-model-comparison/domain/availability";
import { renderAvailabilityReport } from "../llm-model-comparison/domain/availability-report";
import {
  STATUS_SOURCES,
  fixtureStatusFetch,
  liveStatusFetch,
  observeAllStatus,
} from "../vendors/status/index";

// This entrypoint is a PASSIVE status-page observer. It fetches each provider's
// public status page (no API keys, no model calls, no cost) and records what the
// page reports, with provenance. The keyless `--fixture` path reads committed
// status responses for a deterministic, byte-stable self-test; the real path
// does a live fetch of the same public pages. A fetch failure is recorded
// honestly rather than failing the run.

type Args = Readonly<{
  fixture: boolean;
  estimateOnly: boolean;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";
const LIVE_TIMEOUT_MS = 8_000;

type AvailabilityRunArtifact = Readonly<{
  generatedAt: string;
  method: "status-page-observation";
  fixture: boolean;
  sources: ReadonlyArray<{
    provider: string;
    providerName: string;
    sourceUrl: string;
    kind: string;
  }>;
  observations: ReadonlyArray<StatusObservation>;
  summaries: ReadonlyArray<AvailabilityObservationSummary>;
}>;

const parseArgs = (argv: ReadonlyArray<string>): Args => ({
  fixture: argv.includes("--fixture"),
  estimateOnly: argv.includes("--estimate"),
});

const printEstimate = (): void => {
  process.stdout.write(
    `Availability status-page observation: ${STATUS_SOURCES.length} public ` +
      `status pages fetched, no API keys required, $0.00. The real path does a ` +
      `live fetch; --fixture reads committed responses (no network). ` +
      `Use --estimate to make no network calls.\n`,
  );
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  printEstimate();
  if (args.estimateOnly) {
    process.stdout.write("--estimate: dry run, no status pages fetched.\n");
    return;
  }

  const generatedAt = args.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const reportPath = resolve(
    process.cwd(),
    "../../docs/research-reports/llm-availability.md",
  );
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");

  const observations = await observeAllStatus(
    args.fixture ? fixtureStatusFetch : liveStatusFetch(LIVE_TIMEOUT_MS),
    generatedAt,
  );
  const summaries = summarizeObservations(observations);

  const artifact: AvailabilityRunArtifact = {
    generatedAt,
    method: "status-page-observation",
    fixture: args.fixture,
    sources: STATUS_SOURCES.map((source) => ({
      provider: source.provider,
      providerName: source.providerName,
      sourceUrl: source.url,
      kind: source.kind,
    })),
    observations,
    summaries,
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
      generatedAt,
      fixture: args.fixture,
      observations,
      summaries,
      artifactPath: basename(artifactPath),
    }),
    "utf8",
  );

  if (!args.fixture) {
    for (const observation of observations) {
      if (!observation.fetchOk) {
        process.stderr.write(
          `[availability] status fetch failed for ${observation.provider}: ${observation.fetchError}\n`,
        );
      }
    }
  }

  process.stdout.write(`wrote ${reportPath}\n`);
  process.stdout.write(`wrote ${artifactPath}\n`);
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `availability status observation failed: ${String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
