import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import { PROMPT_MANIFEST } from "./manifest";
import type { SvgGenerationResult, SvgGenModelRun, Stat } from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const num = (value: number): string => value.toFixed(1);

const ms = (value: number): string => `${value.toFixed(0)} ms`;

const statCell = (stat: Stat, format: (value: number) => string): string =>
  stat.n === 0
    ? "not measured"
    : `${format(stat.mean)} ± ${format(stat.stdDev)} (n=${stat.n})`;

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
  value: (run: SvgGenModelRun) => number;
  format: (value: number) => string;
}>;

// §4 aspects follow each metric's own direction. Path complexity is descriptive
// (more detail is not inherently better), so it stays in the §7 model table
// rather than being ranked here.
const ASPECTS: ReadonlyArray<Aspect> = [
  {
    title: "Render validity",
    better: "higher",
    value: (run) => run.stats.renderValidity.mean,
    format: pct,
  },
  {
    title: "Animation presence",
    better: "higher",
    value: (run) => run.stats.animationPresence.mean,
    format: pct,
  },
  {
    title: "Generation latency",
    better: "lower",
    value: (run) => run.stats.generationLatencyMs.mean,
    format: ms,
  },
];

/**
 * The §4 overview: one aggregated row per metric over the measured models
 * (best model, median, worst). The per-model and per-prompt tables live in §7
 * Verification Data — §4 stays a concise, decision-relevant summary by the
 * site-wide article policy.
 */
const overviewSection = (result: SvgGenerationResult): string => {
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

"Best"/"Worst" follow each metric's own direction (higher validity and animation presence are better, lower latency is better). Animation presence is measured over the animated prompts only. Token cost and path complexity are reference columns in the model table. The full per-model and per-prompt records are in section 7, Verification Data.`;
};

const modelTable = (result: SvgGenerationResult): string => {
  const header =
    "| Model | Provider | Provenance | Output $/MTok | Latency (mean±sd) | Render valid (mean±sd) | Animation (mean±sd) | Path complexity (mean±sd) | Note |\n" +
    "| ----- | -------- | ---------- | ------------- | ----------------- | ---------------------- | ------------------- | ------------------------- | ---- |";
  const rows = result.runs.map(
    (run) =>
      `| ${escapeCell(run.modelName)} | ${run.provider} | ${run.provenance} | ` +
      `$${run.outputCostPerMTok.toFixed(2)} | ` +
      `${statCell(run.stats.generationLatencyMs, (v) => v.toFixed(0))} | ` +
      `${statCell(run.stats.renderValidity, pct)} | ` +
      `${statCell(run.stats.animationPresence, pct)} | ` +
      `${statCell(run.stats.pathComplexity, num)} | ${escapeCell(run.error ?? "")} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const manifestTable = (): string => {
  const header = "| Prompt id | Kind |\n| --------- | ---- |";
  const rows = PROMPT_MANIFEST.prompts.map(
    (prompt) => `| ${prompt.id} | ${prompt.kind} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

export const renderSvgGenerationReport = (
  result: SvgGenerationResult,
): string =>
  renderEnglishResearchArticle({
    // Sidebar-page title: must equal the topic's sidebar label (source.text in
    // site.ts) — published pages carry title == sidebar label by policy.
    title: "SVG generation",
    description:
      "A reproducible comparison of frontier LLMs generating SVG — render validity, path complexity, animation presence (SMIL/CSS), generation latency, and token cost — scored mechanically from the SVG source.",
    introduction:
      "This report compares how faithfully frontier text models emit **valid, animatable vector graphics**. Every score is computed **mechanically from the SVG source** — well-formedness, drawable-element and path-command counts, and animation markup — so no aesthetic opinion enters the numbers.",
    purpose:
      "The purpose is to record which frontier models produce SVG that actually parses, how much detail they draw, whether they can express motion (SMIL or CSS animation), how fast they return, and at what token cost — the properties that decide whether a model can drive vector-graphics generation in a product.",
    targetModels: `The subjects are the ${result.runs.length} text flagships in the curated registry (\`packages/tech/src/svg-generation/models.ts\`), one per provider, each with a cited source and last-verified date. SVG is emitted through each provider's ordinary completion API, so there is no separate image endpoint and no provider is a non-subject.`,
    targetMetrics:
      "Measured metrics are render validity (well-formed XML rooted at `<svg>` / total, higher is better), path complexity (drawable elements + path commands, descriptive), animation presence (animated prompts carrying a SMIL/CSS animation / total, higher is better), and generation latency (ms, lower is better). Token cost is derived from measured output tokens × catalog price (reference).",
    scopeAndConstraints: `- **Mechanical, not aesthetic.** v1 scores only what the SVG source reveals; it does not judge whether the drawing looks like the prompt. A rasterize-and-vision-judge prompt-fidelity metric is a separate, instrument-versioned follow-up.
- **Render validity is a structural parse** (well-formedness + \`<svg>\` root), dependency-free so it runs keyless in CI; a full rasterizer is the stronger check added with the fidelity metric.
- Prompt manifest version \`${result.manifestVersion}\`: ${PROMPT_MANIFEST.prompts.length} prompts (${PROMPT_MANIFEST.prompts.filter((p) => p.kind === "static").length} static, ${PROMPT_MANIFEST.prompts.filter((p) => p.kind === "animated").length} animated). History connects same-manifest-version points only.
- The fixture path is keyless and deterministic; real model numbers appear only after an owner runs the real path within the approved cost ceiling (run \`--estimate\` first).
- Point-in-time: measured behavior reflects the models and APIs at \`${result.generatedAt}\`; catalog prices are as of each row's last-verified date.`,
    verificationResults: overviewSection(result),
    analysis: result.runs.some((run) => run.provenance === "measured")
      ? "Rows with `measured` provenance can be compared on validity, animation, latency, and cost; path complexity is descriptive context. A high validity with low animation presence localizes what a model gets wrong — it draws well but cannot express motion — versus the reverse."
      : "This run has no measured rows; every configuration was fixtured or errored, so no cross-model claim is made. The committed fixture page exists to prove the pipeline, not to compare models.",
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture client):
npm run research -- svg-generation --fixture

# Cost preview, then the owner-gated real run:
npm run research -- svg-generation --estimate
npm run research -- svg-generation --real
\`\`\``,
    reproductionCost:
      "The fixture path is keyless and costless. A real trial bills each provider for the generation tokens only (a few hundred output tokens per SVG); the agreed ceiling is $5 per trial and `--estimate` must run first. The prompt-fidelity follow-up adds one vision-judge read per generated SVG.",
    cleanup:
      "No external resources are created. SVG is generated in memory and scored; the run writes only the local Markdown/JSON artifacts — review them before committing.",
    verificationData: `**Per-model results**

${modelTable(result)}

**Prompt manifest (version ${result.manifestVersion})**

${manifestTable()}

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-call prompts, latencies, SVG byte lengths, output-token counts, the generated SVG source, and every mechanical score.

Generated: ${result.generatedAt}`,
  });
