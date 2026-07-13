import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import { median } from "./probe";
import type { AgentVmResult, SandboxRun, Stat } from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const ms = (value: number): string => `${value.toFixed(0)} ms`;
const usd6 = (value: number): string => `$${value.toFixed(6)}`;
const usdRate = (value: number): string => `$${value.toFixed(5)}`;

const runtimeCell = (seconds: number | null): string =>
  seconds === null ? "unbounded" : `${seconds}s`;

const yesNo = (value: boolean): string => (value ? "yes" : "no");

const statCell = (stat: Stat): string =>
  stat.n === 0
    ? "not measured"
    : `${stat.mean.toFixed(0)} ± ${stat.stdDev.toFixed(0)} (n=${stat.n})`;

const measured = (result: AgentVmResult): ReadonlyArray<SandboxRun> =>
  result.runs.filter(
    (run) =>
      run.measurement.provenance !== "unreachable" &&
      run.measurement.provenance !== "error",
  );

type Aspect = Readonly<{
  title: string;
  better: "higher" | "lower";
  value: (run: SandboxRun) => number;
  format: (value: number) => string;
}>;

const ASPECTS: ReadonlyArray<Aspect> = [
  {
    title: "Cold start p50",
    better: "lower",
    value: (run) => run.measurement.coldStartMsP50,
    format: ms,
  },
  {
    title: "Cold start p95",
    better: "lower",
    value: (run) => run.measurement.coldStartMsP95,
    format: ms,
  },
  {
    title: "Fixed-task cost",
    better: "lower",
    value: (run) => run.measurement.measuredCostUsd,
    format: usd6,
  },
];

const overviewSection = (result: AgentVmResult): string => {
  const rows = measured(result);
  const counts = `This run has **${rows.length} probed** of ${result.runs.length} provider rows (the rest are \`unreachable\` — no probe adapter/credential yet — or \`error\`, never faked numbers).`;
  if (rows.length === 0) {
    return `${counts}

There are no probed values to summarize; the committed fixture page proves the harness end to end and renders the reference catalog. The reference-capability and per-provider tables are in section 7, Verification Data.`;
  }
  const lines = ASPECTS.map((aspect) => {
    const sorted = [...rows].sort((a, b) =>
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
      `| ${aspect.title} | ${aspect.format(aspect.value(best))} — ${escapeCell(best.card.providerName)} | ` +
      `${aspect.format(median(rows.map(aspect.value)))} | ${aspect.format(aspect.value(worst))} |`
    );
  });
  return `${counts}

| Metric | Best (provider) | Median | Worst |
| ------ | --------------- | ------ | ----- |
${lines.join("\n")}

"Best"/"Worst" follow each metric's own direction (lower cold start and lower cost are better). The isolation model, published rate, and capability columns are reference data in the provider tables. The full per-provider records are in section 7, Verification Data.`;
};

const referenceTable = (result: AgentVmResult): string => {
  const header =
    "| Provider | Isolation | $/vCPU-hr | $/GB-hr | Billing | Max runtime | Snapshot | Filesystem | Egress | GPU |\n" +
    "| -------- | --------- | --------- | ------- | ------- | ----------- | -------- | ---------- | ------ | --- |";
  const rows = result.runs.map((run) => {
    const c = run.card;
    return (
      `| ${escapeCell(c.providerName)} | ${c.isolationModel} | ${usdRate(c.publishedVcpuHourUsd)} | ` +
      `${usdRate(c.publishedGbHourUsd)} | ${c.billingGranularity} | ${runtimeCell(c.maxRuntimeSeconds)} | ` +
      `${yesNo(c.snapshotResume)} | ${c.filesystemPersistence} | ${c.networkEgress} | ${yesNo(c.gpuAvailable)} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

const measuredTable = (result: AgentVmResult): string => {
  const header =
    "| Provider | Provenance | Cold p50 | Cold p95 | Cold (mean±sd) | Warm reuse | Fixed task | Task cost | Note |\n" +
    "| -------- | ---------- | -------- | -------- | -------------- | ---------- | ---------- | --------- | ---- |";
  const rows = result.runs.map((run) => {
    const m = run.measurement;
    const gap = m.provenance === "measured" || m.provenance === "fixtured";
    return (
      `| ${escapeCell(run.card.providerName)} | ${m.provenance} | ` +
      `${gap ? ms(m.coldStartMsP50) : "—"} | ${gap ? ms(m.coldStartMsP95) : "—"} | ` +
      `${gap ? statCell(m.coldStartStat) : "—"} | ${gap ? ms(m.warmReuseMs) : "—"} | ` +
      `${gap ? ms(m.fixedTaskWallClockMs) : "—"} | ${gap ? usd6(m.measuredCostUsd) : "—"} | ${escapeCell(m.error ?? "")} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

const sourceLines = (result: AgentVmResult): string =>
  result.runs
    .map(
      (run) =>
        `- **${escapeCell(run.card.providerName)}** (\`${run.card.id}\`): ${run.card.isolationModel} isolation — source ${run.card.source} (verified ${run.card.lastVerified}).`,
    )
    .join("\n");

export const renderAgentVmReport = (result: AgentVmResult): string =>
  renderEnglishResearchArticle({
    title: "Agent VM / sandbox comparison",
    description:
      "A reproducible comparison of agent VM / sandbox platforms — isolation model, published price, capability envelope, and measured cold-start latency and fixed-task cost.",
    introduction:
      "This report compares the sandbox / microVM platforms an AI agent can run untrusted code in. Reference columns (isolation, price, capability) are curated from each provider's docs; the cold-start and cost columns are produced by a live probe, or by the keyless fixture on the self-test page.",
    purpose:
      "The purpose is to record which agent VM / sandbox platforms exist, how they isolate code, what they cost, and how quickly they boot — the properties that decide which backend an agent's code-execution layer is built on.",
    targetModels: `The subjects are the ${result.runs.length} providers in the curated registry (\`packages/tech/src/agent-vm/models.ts\`), each with a cited source and last-verified date.

${sourceLines(result)}`,
    targetMetrics:
      "Reference metrics (curated): isolation model, published $/vCPU-hr and $/GB-hr (lower is better), billing granularity, max runtime (higher is better), snapshot/resume, filesystem persistence, network egress, GPU availability. Measured metrics (probed): cold-start p50/p95 (ms, lower is better), warm-reuse latency (ms, lower is better), fixed-task wall-clock (ms, lower is better), and derived fixed-task cost (USD, lower is better).",
    scopeAndConstraints: `- **Stated isolation, not audited.** The isolation column records each vendor's documented boundary (Firecracker microVM, gVisor, Kata, container); this topic does not pen-test that boundary.
- **Prices are curated catalog data** at the standard tier and move often — every row carries a source and last-verified date and MUST be reconfirmed at trial time.
- **Cost is compute-time only.** The fixed-task cost prices the task's vCPU-seconds at the published rate; per-boot minimums, account fees, and egress are noted, not folded into the number.
- The fixture path is keyless and deterministic; real cold-start numbers appear only after an owner runs the real path with credentials, within the approved cost ceiling (run \`--estimate\` first). Providers without a probe adapter stay \`unreachable\` until one lands.
- Point-in-time: measured behavior reflects the platforms at \`${result.generatedAt}\`; reference values are as of each row's last-verified date.`,
    verificationResults: overviewSection(result),
    analysis:
      measured(result).length > 0
        ? "Rows with `fixtured`/`measured` provenance can be compared on cold start and cost; isolation, price, and capability are reference context. A low cold-start p50 with a high p95 localizes tail-latency risk; a cheap $/vCPU-hr with a slow boot trades responsiveness for cost."
        : "This run has no probed rows; every provider was unreachable or errored, so no cross-provider latency claim is made. The committed fixture page exists to prove the pipeline and render the reference catalog, not to compare boot times.",
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture provisioner):
npm run research -- agent-vm --fixture

# Cost preview, then the owner-gated real run (needs provider credentials):
npm run research -- agent-vm --estimate
npm run research -- agent-vm --real
\`\`\``,
    reproductionCost:
      "The fixture path is keyless and costless. A real trial bills each reachable provider for the vCPU-seconds of its boots and the fixed task (see the per-provider $/vCPU-hr in the reference table); the agreed range is $1–$8 per trial and `--estimate` must run first.",
    cleanup:
      "A real adapter MUST tear down every sandbox it boots (zero orphaned resources, like the RAG teardown guarantee); the fixture path provisions nothing. The run writes only the local Markdown/JSON artifacts — review them before committing.",
    verificationData: `**Reference catalog (curated)**

${referenceTable(result)}

**Measured probe (fixed task: ${escapeCell(result.task.description)})**

${measuredTable(result)}

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-repetition cold-start samples, warm-reuse and fixed-task timings, and derived costs.

Generated: ${result.generatedAt}`,
  });
