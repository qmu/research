import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import { PROMPT_MANIFEST } from "./manifest";
import type { ImageGenerationResult, ImageGenModelRun, Stat } from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const usd = (value: number): string => `$${value.toFixed(3)}`;

const statCell = (stat: Stat, format: (value: number) => string): string =>
  stat.n === 0
    ? "not measured"
    : `${format(stat.mean)} ± ${format(stat.stdDev)} (n=${stat.n})`;

const ms = (value: number): string => `${value.toFixed(0)} ms`;

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

type Aspect = Readonly<{
  title: string;
  better: "higher" | "lower";
  value: (run: ImageGenModelRun) => number;
  format: (value: number) => string;
}>;

const ASPECTS: ReadonlyArray<Aspect> = [
  {
    title: "Generation latency",
    better: "lower",
    value: (run) => run.stats.generationLatencyMs.mean,
    format: ms,
  },
  {
    title: "Prompt adherence",
    better: "higher",
    value: (run) => run.stats.promptAdherence.mean,
    format: pct,
  },
  {
    title: "Text render accuracy",
    better: "higher",
    value: (run) => run.stats.textRenderAccuracy.mean,
    format: pct,
  },
];

/**
 * The §4 overview: one aggregated row per metric over the measured models
 * (best model, median, worst). The per-model and per-prompt tables live in §7
 * Verification Data — §4 stays a concise, decision-relevant summary by the
 * site-wide article policy.
 */
const overviewSection = (result: ImageGenerationResult): string => {
  const measured = result.runs.filter((run) => run.provenance === "measured");
  const counts = `This run has **${measured.length} measured** of ${result.runs.length} model rows (non-measured rows are \`fixtured\` harness checks or \`error\` rows, never faked numbers).`;
  if (measured.length === 0) {
    return `${counts}

There are no measured values to summarize; the committed fixture page proves the harness end to end. The per-model table is in section 7, Verification Data.`;
  }
  const rows = ASPECTS.map((aspect) => {
    const sorted = [...measured].sort((a, b) =>
      aspect.better === "higher"
        ? aspect.value(b) - aspect.value(a)
        : aspect.value(a) - aspect.value(b),
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best === undefined || worst === undefined) {
      return `| ${aspect.title} | n/a | n/a | n/a |`;
    }
    return (
      `| ${aspect.title} | ${aspect.format(aspect.value(best))} — ${escapeCell(best.modelName)} | ` +
      `${aspect.format(medianOf(measured.map(aspect.value)))} | ${aspect.format(aspect.value(worst))} |`
    );
  });
  return `${counts}

| Metric | Best (model) | Median | Worst |
| ------ | ------------ | ------ | ----- |
${rows.join("\n")}

"Best"/"Worst" follow each metric's own direction (lower latency is better, higher adherence and text accuracy are better). Per-image catalog prices are reference data in the model table. The full per-model and per-prompt records are in section 7, Verification Data.`;
};

const modelTable = (result: ImageGenerationResult): string => {
  const header =
    "| Model | Provider | Provenance | Price/image | Latency (mean±sd) | Adherence (mean±sd) | Text accuracy (mean±sd) | Note |\n" +
    "| ----- | -------- | ---------- | ----------- | ----------------- | ------------------- | ----------------------- | ---- |";
  const rows = result.runs.map(
    (run) =>
      `| ${escapeCell(run.modelName)} | ${run.provider} | ${run.provenance} | ` +
      `${usd(run.pricePerImageUsd)} (${escapeCell(run.sizeTier)}) | ` +
      `${statCell(run.stats.generationLatencyMs, (v) => v.toFixed(0))} | ` +
      `${statCell(run.stats.promptAdherence, pct)} | ` +
      `${statCell(run.stats.textRenderAccuracy, pct)} | ${escapeCell(run.error ?? "")} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const manifestTable = (): string => {
  const header =
    "| Prompt id | Kind | Rubric size | Expected text |\n| --------- | ---- | ----------- | ------------- |";
  const rows = PROMPT_MANIFEST.prompts.map(
    (prompt) =>
      `| ${prompt.id} | ${prompt.kind} | ${prompt.constraints.length} | ${escapeCell(prompt.expectedText ?? "—")} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const nonSubjectLines = (result: ImageGenerationResult): string =>
  result.nonSubjects
    .map(
      (entry) =>
        `- **${escapeCell(entry.providerName)}** is not a subject: it ${entry.reason} (verified ${entry.lastVerified}).`,
    )
    .join("\n");

export const renderImageGenerationReport = (
  result: ImageGenerationResult,
): string =>
  renderEnglishResearchArticle({
    // Sidebar-page title: must equal the topic's sidebar label (source.text in
    // site.ts) — published pages carry title == sidebar label by policy.
    title: "Image generation",
    description:
      "A reproducible comparison of API-accessible image-generation models — generation latency, per-image catalog cost, prompt adherence over a mechanical rubric, and exact-text rendering accuracy.",
    introduction:
      "This report compares image-generation models by **mechanically verifiable** behavior only — a fixed vision-judge model answers a deterministic yes/no rubric per image; no aesthetic opinion enters the scores.",
    purpose:
      "The purpose is to record which API-accessible image-generation models exist, what one image costs, how fast it returns, and how faithfully the model follows checkable prompt constraints and renders exact text — the properties that decide integration choices.",
    targetModels: `The subjects are the ${result.runs.length} image-generation models in the curated registry (\`packages/tech/src/image-generation/models.ts\`), one per covered provider, each with a cited source and last-verified date.

${nonSubjectLines(result)}`,
    targetMetrics:
      "Measured metrics are generation latency (ms, lower is better), prompt adherence (satisfied rubric constraints / total, higher is better), and text render accuracy (expected tokens found in a vision transcription / expected tokens, higher is better). Per-image cost is curated catalog data (reference), not a measurement.",
    scopeAndConstraints: `- **Judged, but rubric-constrained.** A fixed vision judge (\`${escapeCell(result.judgeModel)}\`) answers deterministic yes/no questions and transcribes rendered text; it never scores beauty or style. Swapping the judge is an instrument change, not a routine update.
- Prompt manifest version \`${result.manifestVersion}\`: ${PROMPT_MANIFEST.prompts.length} prompts (${PROMPT_MANIFEST.prompts.filter((p) => p.kind === "adherence").length} rubric, ${PROMPT_MANIFEST.prompts.filter((p) => p.kind === "text").length} exact-text). History connects same-manifest-version points only.
- **Image binaries are not committed.** The artifact records byte length, timing, judge answers, and scores — enough to regenerate this page — never the images themselves.
- The fixture path is keyless and deterministic; real model numbers appear only after an owner runs the real path within the approved cost ceiling (run \`--estimate\` first).
- Point-in-time: measured behavior reflects the models and APIs at \`${result.generatedAt}\`; catalog prices are as of each row's last-verified date.`,
    verificationResults: overviewSection(result),
    analysis: result.runs.some((run) => run.provenance === "measured")
      ? "Rows with `measured` provenance can be compared on latency, adherence, and text rendering; price is catalog context. A low adherence score with a high text score (or the reverse) localizes what a model gets wrong — constraint following versus glyph rendering."
      : "This run has no measured rows; every configuration was fixtured or errored, so no cross-model claim is made. The committed fixture page exists to prove the pipeline, not to compare models.",
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture clients):
npm run research -- image-generation --fixture

# Cost preview, then the owner-gated real run:
npm run research -- image-generation --estimate
npm run research -- image-generation --real
\`\`\``,
    reproductionCost:
      "The fixture path is keyless and costless. A real trial bills each provider per generated image (see the per-model catalog prices) plus one vision-judge read per image; the agreed ceiling is $20 per trial and `--estimate` must run first.",
    cleanup:
      "No external resources are created. Generated images are held in memory for judging and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.",
    verificationData: `**Per-model results**

${modelTable(result)}

**Prompt manifest (version ${result.manifestVersion})**

${manifestTable()}

**Judge provenance.** Every image was read by \`${escapeCell(result.judgeModel)}\`; each call's rubric answers and transcriptions are preserved verbatim in the artifact.

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-call prompts, latencies, image byte lengths, judge answers, and scores.

Generated: ${result.generatedAt}`,
  });
