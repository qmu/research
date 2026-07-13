import type { Aggregate, ConfigRun, Provenance } from "./types";
import {
  ASPECT_META,
  aspectsForMetrics,
  type SplitArtifact,
  type SplitAspect,
} from "./split";
import { buildSchemaPrompt } from "./json-schema";
import { buildSpeedPrompt } from "./speed-probe";
import {
  INFORMATION_ACCURACY_MANIFEST,
  buildBatchedInformationAccuracyPrompt,
} from "./information-accuracy";
import { providerDisplayName } from "./provider";
import { renderEnglishResearchArticle } from "../../research/domain/article-outline";

/**
 * Render a focused per-topic (speed or accuracy) report from a `SplitArtifact`.
 * This is a compact, self-contained renderer — it deliberately does NOT reuse
 * the combined comparison renderer, so `compare` stays byte-stable and each
 * split page shows only its own metrics. The page states plainly that its
 * numbers are a projection of the shared `compare` sweep (same measurements,
 * never re-run), so a reader is not misled into thinking it is an independent
 * measurement.
 */

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const usd = (n: number): string => `$${n.toFixed(2)}`;

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const notMeasured = (p: Provenance): string =>
  p === "error" ? "n/a (error)" : "n/a (fixtured)";

const measured = (run: ConfigRun, value: string): string =>
  run.provenance === "measured" ? value : notMeasured(run.provenance);

const ci95HalfWidth = (a: Aggregate): number =>
  a.n < 2 ? 0 : (1.96 * a.stdDev) / Math.sqrt(a.n);

const numberWithCi = (a: Aggregate, digits: number, unit = ""): string => {
  const suffix = unit === "" ? "" : ` ${unit}`;
  if (a.n < 2) return `${a.mean.toFixed(digits)}${suffix} (n=${a.n})`;
  return `${a.mean.toFixed(digits)} ± ${ci95HalfWidth(a).toFixed(digits)}${suffix} (95% CI, n=${a.n})`;
};

const percentWithCi = (a: Aggregate, digits: number): string => {
  if (a.n < 2) return `${(a.mean * 100).toFixed(digits)}% (n=${a.n})`;
  return `${(a.mean * 100).toFixed(digits)}% ± ${(ci95HalfWidth(a) * 100).toFixed(digits)}pp (95% CI, n=${a.n})`;
};

const range = (a: Aggregate, digits: number): string =>
  `${a.min.toFixed(digits)}–${a.max.toFixed(digits)}`;

const joinList = (items: ReadonlyArray<string>): string => {
  if (items.length === 0) return "the configured probes";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
};

const coverageSummary = (artifact: SplitArtifact): string => {
  if (artifact.group === "speed") return artifact.summary;

  const metricSet = new Set(artifact.metrics);
  const parts: string[] = [];
  if (metricSet.has("maxSchemaDepth") || metricSet.has("maxSchemaBreadth")) {
    parts.push("JSON-schema structural limits");
  }
  if (metricSet.has("lengthAccuracy")) {
    parts.push("length-instruction following");
  }
  if (metricSet.has("informationAccuracy")) {
    parts.push("factual information accuracy");
  }
  return joinList(parts);
};

const formatAspect = (aspect: SplitAspect, a: Aggregate): string =>
  aspect.kind === "percent"
    ? percentWithCi(a, 0)
    : numberWithCi(a, 0, aspect.unit);

const label = (run: ConfigRun): string =>
  `${escapeCell(run.modelName)} [${escapeCell(run.effort)}]`;

const headlineTable = (artifact: SplitArtifact): string => {
  const aspects = aspectsForMetrics(artifact.metrics);
  const metricHeaders = aspects.map((a) => a.header).join(" | ");
  const metricDivider = aspects.map(() => "---").join(" | ");
  const header =
    `| Provider | Model | Tier | Effort | Cost (in / out per MTok) | ${metricHeaders} |\n` +
    `| -------- | ----- | ---- | ------ | ------------------------ | ${metricDivider} |`;
  const rows = artifact.configs.map((run) => {
    const cells = aspects
      .map((aspect) =>
        measured(run, formatAspect(aspect, run.stats[aspect.key])),
      )
      .join(" | ");
    return (
      `| ${escapeCell(providerDisplayName(run.provider))} | ${escapeCell(run.modelName)} | ${run.tier} | ` +
      `${escapeCell(run.effort)} | ${usd(run.inputCostPerMTok)} / ${usd(run.outputCostPerMTok)} | ${cells} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

const aspectSentence = (
  aspect: SplitAspect,
  measuredRuns: ReadonlyArray<ConfigRun>,
): string => {
  if (measuredRuns.length === 0) {
    return "This run has no measured values for this aspect; every configuration was fixtured or errored.";
  }
  const value = (run: ConfigRun): number => run.stats[aspect.key].mean;
  const sorted = [...measuredRuns].sort((a, b) =>
    aspect.better === "higher" ? value(b) - value(a) : value(a) - value(b),
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (best === undefined || worst === undefined) return "";
  const dir =
    aspect.better === "higher" ? "Highest measured" : "Lowest measured";
  return (
    `${dir} of the ${measuredRuns.length} measured configuration(s): ` +
    `**${label(best)}** at ${formatAspect(aspect, best.stats[aspect.key])}. ` +
    `Opposite end of this measurement: ${label(worst)} at ${formatAspect(aspect, worst.stats[aspect.key])}.`
  );
};

const aspectSection = (
  aspect: SplitAspect,
  configs: ReadonlyArray<ConfigRun>,
  measuredRuns: ReadonlyArray<ConfigRun>,
): string => {
  const header =
    "| Configuration | Mean ± 95% CI | Min–Max | n |\n| ------------- | ------------ | ------- | - |";
  const rows = configs.map((run) => {
    const a = run.stats[aspect.key];
    return (
      `| ${label(run)} | ${measured(run, formatAspect(aspect, a))} | ` +
      `${measured(run, range(a, aspect.digits))} | ${measured(run, String(a.n))} |`
    );
  });
  return (
    `**${aspect.title}**\n\n${header}\n${rows.join("\n")}\n\n` +
    `${aspectSentence(aspect, measuredRuns)}`
  );
};

const formatValue = (aspect: SplitAspect, value: number): string =>
  aspect.kind === "percent"
    ? `${(value * 100).toFixed(0)}%`
    : `${value.toFixed(aspect.digits)}${aspect.unit === undefined ? "" : ` ${aspect.unit}`}`;

const medianOf = (values: ReadonlyArray<number>): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  if (upper === undefined) return 0;
  return sorted.length % 2 === 0 && lower !== undefined
    ? (lower + upper) / 2
    : upper;
};

/**
 * The §4 results overview: one aggregated row per aspect (best configuration,
 * median, worst) so a reader gets the decision-relevant picture at a glance.
 * The exhaustive per-configuration tables live in §7 Verification Data.
 */
const overviewTable = (
  aspects: ReadonlyArray<SplitAspect>,
  measuredRuns: ReadonlyArray<ConfigRun>,
): string => {
  const header =
    "| Aspect | Best (configuration) | Median | Worst |\n| ------ | -------------------- | ------ | ----- |";
  const rows = aspects.map((aspect) => {
    const value = (run: ConfigRun): number => run.stats[aspect.key].mean;
    const sorted = [...measuredRuns].sort((a, b) =>
      aspect.better === "higher" ? value(b) - value(a) : value(a) - value(b),
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best === undefined || worst === undefined) {
      return `| ${aspect.title} | n/a | n/a | n/a |`;
    }
    return (
      `| ${aspect.title} | ${formatValue(aspect, value(best))} — ${label(best)} | ` +
      `${formatValue(aspect, medianOf(measuredRuns.map(value)))} | ${formatValue(aspect, value(worst))} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

const speedTransparency = (artifact: SplitArtifact): string => {
  const speedPrompt = buildSpeedPrompt(
    artifact.probe.speedTargetWords,
    artifact.probe.speedTopic,
  );
  return `**Unified speed probe** (streamed exact-length generation, repeated
${artifact.probe.speedTrials}× per configuration; one call yields sustained
tok/s over the generation window — excluding time-to-first-token — plus TTFT
and total response time):

\`\`\`text
${speedPrompt}
\`\`\``;
};

const accuracyTransparency = (artifact: SplitArtifact): string => {
  const sp = artifact.probe.schemaProbe;
  const schemaPrompt = buildSchemaPrompt({ depth: sp.depth.cap, breadth: 1 });
  const lengthPrompt = buildSpeedPrompt(
    artifact.probe.speedTargetWords,
    artifact.probe.speedTopic,
  );
  const informationPrompt = buildBatchedInformationAccuracyPrompt(
    INFORMATION_ACCURACY_MANIFEST.questions,
  );
  const base = `**Schema-complexity probe** (structured-output mode, run once per
configuration; each axis is searched independently — depth up to
${sp.depth.cap} nesting levels, breadth up to ${sp.breadth.cap} fields — by
exact binary search, warm-started from the previous run's measured boundary
when one exists. The cap rung on the depth axis asks for):

\`\`\`text
${schemaPrompt}
\`\`\`

**Length accuracy source** (the unified speed probe's exact-length generation;
accuracy is scored against its ${artifact.probe.speedTargetWords}-word target):

\`\`\`text
${lengthPrompt}
\`\`\``;
  // The information-accuracy probe was added after some sweeps; only describe it
  // when this run's data actually carries the metric (older artifacts omit both
  // the metric and its probe params). Gating on the metric avoids reading probe
  // params that a stale artifact lacks at runtime.
  if (!artifact.metrics.includes("informationAccuracy")) {
    return base;
  }
  const info = artifact.probe.informationAccuracy;
  return `${base}

**Information-accuracy probe** (TruthfulQA manifest
${escapeCell(info.manifestVersion)};
${info.questionCount} short factual questions in one batched call;
headline score = deterministic alias/exact-match token F1 per question):

\`\`\`text
${informationPrompt}
\`\`\``;
};

const transparencySection = (artifact: SplitArtifact): string =>
  `The projected artifact preserves this topic's prompts, raw trial outputs, token
counts, timing values, and (for accuracy) schema-conformance results and
provider rejection messages. This page can be regenerated from that artifact
without rerunning the providers.

${artifact.group === "speed" ? speedTransparency(artifact) : accuracyTransparency(artifact)}

**Complete raw record.** Every configuration, trial, and this topic's calls are
committed alongside this page as a JSON artifact:
[\`${escapeCell(artifact.artifactPath)}\`](./${escapeCell(artifact.artifactPath)}).
It is projected from the combined comparison record
\`${escapeCell(artifact.sourceArtifact)}\` — the same measurements, never re-run.`;

export const renderSplitReport = (artifact: SplitArtifact): string => {
  const configs = artifact.configs;
  const measuredRuns = configs.filter((r) => r.provenance === "measured");
  const anyNonMeasured = configs.some((r) => r.provenance !== "measured");
  const providers = [...new Set(configs.map((r) => r.provider))].length;
  const models = [...new Set(configs.map((r) => r.id))].length;
  const aspects = aspectsForMetrics(artifact.metrics);
  const trialCount = plural(artifact.trials, "trial");
  const coveredSummary = coverageSummary(artifact);

  const aspectSections = aspects
    .map((aspect) => aspectSection(aspect, configs, measuredRuns))
    .join("\n\n");

  const omittedNote =
    artifact.omittedMetrics.length === 0
      ? ""
      : `\n**Not measured in this run.** ${artifact.omittedMetrics
          .map((key) => ASPECT_META[key].title)
          .join(
            ", ",
          )} — the source sweep (\`${escapeCell(artifact.sourceArtifact)}\`) predates this probe, so it is omitted here rather than shown as a value. Re-run \`compare\` to include it.\n`;

  const analysis = aspects
    .map((aspect) => aspectSentence(aspect, measuredRuns))
    .filter((sentence) => sentence !== "")
    .join("\n\n");

  return renderEnglishResearchArticle({
    title: artifact.title,
    description: `A reproducible ${artifact.group} comparison of ${models} large language models across ${providers} providers and ${configs.length} model×effort configurations, covering ${coveredSummary}, over ${trialCount}. Projected from the shared LLM comparison sweep.`,
    introduction:
      "The numbers here are a **projection of the combined LLM comparison sweep**: the same trials, model×effort matrix, statistics, and provenance, restricted to this topic's probes.",
    purpose:
      "This report helps narrow model choices by the measured constraints that matter for this topic. It is not a general model ranking and it does not re-run a separate benchmark.",
    targetModels: `The report covers **${configs.length} model×effort configurations** across ${models} models and ${providers} providers. Curated catalog facts (provider, model, tier, price, effort) come from the model registry.`,
    targetMetrics: `This topic covers ${coveredSummary}. Metric cells are reported as mean ± 95% confidence interval when n ≥ 2; metrics with n < 2 show the mean and sample count.`,
    scopeAndConstraints: `- **${trialCount}** per configuration×probe. This sample supports a run-level comparison, not a statistical claim about stable provider behavior.
- **Point-in-time.** Measured behavior reflects the models and APIs at \`${escapeCell(artifact.generatedAt)}\`.
- This topic tests narrow behaviors only (${coveredSummary}); it does not measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable within a provider than across providers.
${
  anyNonMeasured
    ? "- **This run includes non-measured configurations.** `n/a (fixtured)` and `n/a (error)` cells are not live measurements.\n"
    : ""
}${omittedNote}`,
    verificationResults: `This run measured **${measuredRuns.length} of ${configs.length} configurations** across ${plural(providers, "provider")} and ${plural(models, "model")}, over ${trialCount} per configuration×probe.

${overviewTable(aspects, measuredRuns)}

Values are per-configuration means; "Best"/"Worst" follow each aspect's own direction (higher-is-better or lower-is-better). The full per-configuration tables — every model×effort cell with confidence intervals, min–max, and provenance — are in section 7, Verification Data.`,
    analysis:
      analysis === ""
        ? "This run has no measured values for this topic; every configuration was fixtured or errored."
        : analysis,
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (projects the committed compare fixture):
npm run research -- ${artifact.group} --fixture

# Against real providers, run the shared sweep, then project:
npm run compare
npm run research -- ${artifact.group} --real
\`\`\``,
    reproductionCost:
      "The fixture projection is keyless and costless. The real path bills the shared `npm run compare` sweep; run `npm run compare -- --estimate` before a provider run to preview call count, estimated cost, and ETA.",
    cleanup:
      "The projection creates no external resources. Real runs write local `.real` Markdown/data artifacts and update the shared comparison history; review those files before committing.",
    verificationData: `${headlineTable(artifact)}

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data. The metric columns are measured values. \`n/a (fixtured)\` means the deterministic fixture client produced the cell; \`n/a (error)\` means every trial for that configuration failed.

Each detail table reports observed min-max and contributing trial count for one measured aspect.

${aspectSections}

${transparencySection(artifact)}

The projection writes \`${artifact.artifactPath}\` and this Markdown page. The source sweep remains \`${artifact.sourceArtifact}\`, so speed and accuracy stay auditable back to the same underlying run.`,
  });
};
