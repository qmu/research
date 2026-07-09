import type { Aggregate, ConfigRun, Provenance } from "./types";
import {
  ASPECT_META,
  aspectsForMetrics,
  type SplitArtifact,
  type SplitAspect,
} from "./split";
import { buildThroughputPrompt } from "./throughput";
import { buildSchemaPrompt } from "./json-schema";
import { buildLengthPrompt } from "./length-accuracy";
import {
  INFORMATION_ACCURACY_MANIFEST,
  buildInformationAccuracyPrompt,
} from "./information-accuracy";
import { providerDisplayName } from "./provider";

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
  if (
    metricSet.has("maxSchemaDepth") ||
    metricSet.has("maxSchemaBreadth")
  ) {
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
    `### ${aspect.title}\n\n${header}\n${rows.join("\n")}\n\n` +
    `${aspectSentence(aspect, measuredRuns)}`
  );
};

const speedTransparency = (artifact: SplitArtifact): string => {
  const throughputPrompt = buildThroughputPrompt(
    artifact.probe.throughputTargetWords,
    artifact.probe.throughputTopic,
  );
  return `**Throughput probe** (streamed long generation; sustained tok/s is
measured over the generation window, excluding time-to-first-token):

\`\`\`text
${throughputPrompt}
\`\`\`

**Latency probe** (streamed short prompt; TTFT + total response time):

\`\`\`text
${escapeCell(artifact.probe.latencyPrompt)}
\`\`\``;
};

const accuracyTransparency = (artifact: SplitArtifact): string => {
  const sp = artifact.probe.schemaProbe;
  const schemaPrompt = buildSchemaPrompt({ depth: sp.depth.start, breadth: 1 });
  const lengthPrompt = buildLengthPrompt(
    artifact.probe.lengthTargetWords,
    artifact.probe.lengthTopic,
  );
  const informationItem = INFORMATION_ACCURACY_MANIFEST.questions[0];
  const informationPrompt =
    informationItem === undefined
      ? ""
      : buildInformationAccuracyPrompt(informationItem);
  const base = `**Schema-complexity probe** (structured-output mode; each axis is
escalated independently — depth up to ${sp.depth.cap} nesting levels, breadth up
to ${sp.breadth.cap} fields — climbing geometrically then bisecting to the tested
maximum. The first rung on the depth axis asks for):

\`\`\`text
${schemaPrompt}
\`\`\`

**Length probe:**

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
${info.questionCount} short factual questions;
headline score = deterministic alias/exact-match token F1):

\`\`\`text
${informationPrompt}
\`\`\``;
};

const transparencySection = (artifact: SplitArtifact): string =>
  `## Data transparency

The projected artifact preserves this topic's prompts, raw trial outputs, token
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

  return `---
title: ${artifact.title}
description: A reproducible ${artifact.group} comparison of ${models} large language models across ${providers} providers and ${configs.length} model×effort configurations, covering ${coveredSummary}, over ${trialCount}. Projected from the shared LLM comparison sweep.
---

# ${artifact.title}

This report compares **${configs.length} model×effort configurations** across
${models} models and ${providers} providers on ${coveredSummary}, over
**${trialCount}**.

The numbers here are a **projection of the combined LLM comparison sweep** — the
same trials, model×effort matrix, statistics, and provenance, restricted to this
topic's probes. They are not a separate measurement, so they match the combined
report cell-for-cell. Curated catalog facts (provider, model, tier, price,
effort) come from the model registry; measured values come from the projected
run artifact linked below.

## Comparison

${headlineTable(artifact)}

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data.
The metric columns are measured values, each reported as mean ± 95% confidence
interval (1.96 × sample standard deviation / √n) with n over ${trialCount}.
\`n/a (fixtured)\` means the deterministic fixture client produced the cell (no
API key was used); \`n/a (error)\` means every trial for that configuration
failed. Provenance is written in the cell text, never encoded only by color.
${omittedNote}

## Per-aspect measurements

Each table reports the mean ± 95% confidence interval, observed min–max, and
contributing trial count for one measured aspect. A metric with n < 2 is shown
as a mean only and labelled with its n.

${aspectSections}

${transparencySection(artifact)}

## Scope & limitations

- **${trialCount}** per configuration×probe. This sample supports a run-level
  comparison, not a statistical claim about stable provider behavior.
- **Point-in-time.** Measured behavior reflects the models and APIs at the
  generated timestamp below.
- This topic tests narrow behaviors only (${coveredSummary}); it does not
  measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable
  within a provider than across providers.
${
  anyNonMeasured
    ? "- **This run includes non-measured configurations.** `n/a (fixtured)` and `n/a (error)` cells are not live measurements.\n"
    : ""
}- **Generated:** ${escapeCell(artifact.generatedAt)}

## Reproduce

\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (projects the committed compare fixture):
npm run research -- ${artifact.group} --fixture

# Against real providers, run the shared sweep, then project:
npm run compare        # measures every probe once
npm run research -- ${artifact.group} --real
\`\`\`

This page is a projection of the combined comparison; run \`compare\` to measure
and \`research ${artifact.group}\` to regenerate this focused view.
`;
};
