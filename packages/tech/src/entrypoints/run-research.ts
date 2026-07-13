import { isDirectRun } from "./direct-run";
import {
  buildLegacyArgv,
  findTopic,
  planPipeline,
  topicIds,
  TOPICS,
  type TopicMode,
} from "../research/domain/topic";
import { runInsightsStage } from "../research/insights-runner";
import { runTranslationStage } from "../research/translate-runner";
import { runReportTranslation } from "../research/report-translation-runner";
import {
  appendRelatedToTopicPages,
  composeTopicCurrentArticle,
} from "../research/current-article-runner";
import { findPublishedResearchTopic } from "../research/domain/site";
import { runSplitTopic } from "./run-split-topic";
import { runReferenceTopic } from "./run-reference-topic";

// Fixed provenance timestamp is not needed here — insights only run on real
// mode, where a live clock is correct. estimate never writes, so its output is
// deterministic regardless.
const nowIso = (): string => new Date().toISOString();

/**
 * Unified research CLI: `research <topic> [--fixture|--estimate|--real] [...]`.
 * One thin dispatcher over the per-topic registry (`research/domain/topic.ts`):
 * it translates the uniform mode flags into each legacy entrypoint's argv and
 * delegates, so every topic's benchmark behaves exactly as its standalone
 * `npm run <topic>` alias. The default mode is `fixture` — keyless, costless,
 * deterministic; a real (provider-billed) run always takes an explicit
 * `--real`.
 */
type TopicModule = Readonly<{ main: () => Promise<void> }>;

const RUNNERS: Readonly<Record<string, () => Promise<TopicModule>>> = {
  "llm-model-comparison": () => import("./run-llm-model-comparison"),
  // speed / accuracy are projections of the compare sweep, not separate
  // benchmarks — their "benchmark" stage re-projects the compare artifact.
  speed: () => Promise.resolve({ main: () => runSplitTopic("speed") }),
  accuracy: () => Promise.resolve({ main: () => runSplitTopic("accuracy") }),
  rag: () => import("./run-rag-benchmark"),
  ocr: () => import("./run-ocr-comparison"),
  "image-generation": () => import("./run-image-generation"),
  "deep-research": () => import("./run-deep-research"),
  availability: () => import("./run-llm-availability"),
};

/** Exported so a test can hold the benchmark-runner map and the benchmark-kind
 * topics in sync. Reference topics (catalog/article) dispatch by `kind`, not
 * through this map. */
export const RUNNER_TOPIC_IDS: ReadonlyArray<string> =
  Object.keys(RUNNERS).sort();

const MODE_FLAGS: ReadonlyArray<readonly [string, TopicMode]> = [
  ["--fixture", "fixture"],
  ["--estimate", "estimate"],
  ["--real", "real"],
];

const usage = (): string =>
  [
    "Usage: research <topic> [--fixture|--estimate|--real] [topic args...]",
    "",
    "Modes: --fixture (default; keyless, deterministic), --estimate (cost",
    "preview, no provider calls), --real (owner-triggered, provider-billed).",
    "",
    "Topics:",
    ...TOPICS.map((topic) => `  ${topic.id.padEnd(22)} ${topic.title}`),
    "",
  ].join("\n");

export const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const [topicId, ...rawArgs] = argv;
  if (topicId === undefined || topicId === "--help" || topicId === "--list") {
    process.stdout.write(usage());
    if (topicId === undefined) process.exitCode = 1;
    return;
  }
  const spec = findTopic(topicId);
  if (spec === undefined) {
    process.stderr.write(
      `research: unknown topic '${topicId}' (topics: ${topicIds().join(", ")})\n`,
    );
    process.exitCode = 1;
    return;
  }

  const requested = MODE_FLAGS.filter(([flag]) => rawArgs.includes(flag));
  if (requested.length > 1) {
    process.stderr.write(
      `research: pass at most one of ${MODE_FLAGS.map(([flag]) => flag).join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const mode: TopicMode = requested[0]?.[1] ?? "fixture";
  const rest = rawArgs.filter((arg) =>
    MODE_FLAGS.every(([flag]) => flag !== arg),
  );

  const legacyArgv = buildLegacyArgv(spec, mode, rest);
  for (const stage of planPipeline(spec, mode)) {
    if (stage === "benchmark" && spec.kind === "catalog") {
      await runReferenceTopic({ topicId: spec.id, kind: "catalog" });
    } else if (stage === "benchmark" && spec.kind === "article") {
      await runReferenceTopic({
        topicId: spec.id,
        kind: "article",
        articlePath: spec.articlePath,
      });
    } else if (stage === "benchmark") {
      const load = RUNNERS[spec.id];
      if (load === undefined) {
        throw new Error(`no runner bound for topic '${spec.id}'`);
      }
      // The legacy entrypoints parse process.argv themselves; hand them the
      // translated argv so their behavior (and outputs) stay byte-identical.
      process.argv = [
        process.argv[0] ?? "node",
        `research:${spec.id}`,
        ...legacyArgv,
      ];
      await (await load()).main();
    } else if (
      stage === "insights" &&
      (mode === "real" || mode === "estimate")
    ) {
      await runInsightsStage({ spec, mode, generatedAt: nowIso() });
    } else if (
      stage === "translation" &&
      (mode === "real" || mode === "estimate")
    ) {
      // The published Japanese page is a translation of the composed English
      // CURRENT page (7-section article + 推移 + 過去の調査), not of the
      // insights prose. On a real run, compose the freshly-rendered current
      // page first, then translate it — so English → translate → Japanese
      // holds and the two languages never fork (the speed EN/JP bug).
      const published = findPublishedResearchTopic(spec.id) !== undefined;
      if (mode === "real" && published) {
        await composeTopicCurrentArticle(spec.id);
      }
      if (published) {
        await runReportTranslation({
          topicId: spec.id,
          mode,
          generatedAt: nowIso(),
        });
        // The per-language past-survey links are appended after translation, so
        // the English and Japanese pages each link their own-language frames.
        if (mode === "real") {
          await appendRelatedToTopicPages(spec.id);
        }
      } else {
        await runTranslationStage({ spec, mode, generatedAt: nowIso() });
      }
    } else {
      // No stage should reach here: planPipeline only emits benchmark on the
      // fixture path, and both LLM stages are handled above for real/estimate.
      process.stdout.write(
        `research ${spec.id}: stage '${stage}' skipped (mode ${mode})\n`,
      );
    }
  }
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`research failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
