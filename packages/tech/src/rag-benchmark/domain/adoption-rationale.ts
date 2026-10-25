import type { BackendRun } from "./types";

/**
 * The adopt/reject call for one backend's measured run, and the four
 * factors a reader needs to check that call: speed, quality, peak memory,
 * and the reason any of those three went unmeasured. The order is fixed —
 * speed, quality, peak memory, missing-data reason — so every rendered row
 * reads the same way regardless of which factor actually decided the
 * verdict.
 */
export type AdoptionVerdict = "adopt" | "reject";

export type AdoptionFactor = Readonly<{
  label: string;
  summary: string;
  detail: string;
}>;

export type AdoptionFactors = readonly [
  AdoptionFactor,
  AdoptionFactor,
  AdoptionFactor,
  AdoptionFactor,
];

export type AdoptionRationale = Readonly<{
  verdict: AdoptionVerdict;
  verdictReason: string;
  /** Fixed order: speed, quality, peak memory, missing-data reason. */
  factors: AdoptionFactors;
}>;

// A backend above either ceiling/floor is disqualified regardless of the
// other factor — both must pass, and the run must be a real measurement.
export const SPEED_ADOPT_CEILING_P50_MS = 2000;
export const QUALITY_ADOPT_FLOOR_RECALL_AT_K = 0.5;

const speedFactor = (run: BackendRun): AdoptionFactor => {
  const p50 = run.operational.queryLatencyP50Ms;
  const stdDev = run.operational.queryLatencyP50MsStdDev;
  const trials = run.operational.trialCount;
  const passes = p50 <= SPEED_ADOPT_CEILING_P50_MS;
  const against = passes ? "at or under" : "over";
  return {
    label: "Speed",
    summary: `${p50.toFixed(0)} ms`,
    detail: `Query p50 latency is ${p50.toFixed(0)} ms (± ${stdDev.toFixed(0)} ms sample stdDev, ${trials} trial(s)), ${against} the ${SPEED_ADOPT_CEILING_P50_MS} ms adoption ceiling.`,
  };
};

const qualityFactor = (run: BackendRun): AdoptionFactor => {
  const recall = run.retrieval.recallAtK;
  const ci = run.retrieval.recallAtKCi95;
  const passes = recall >= QUALITY_ADOPT_FLOOR_RECALL_AT_K;
  const against = passes ? "at or above" : "below";
  const floor = (QUALITY_ADOPT_FLOOR_RECALL_AT_K * 100).toFixed(0);
  return {
    label: "Quality",
    summary: `${(recall * 100).toFixed(1)}%`,
    detail: `Recall@${run.k} is ${(recall * 100).toFixed(1)}% (95% CI ${(ci.lower * 100).toFixed(1)}%–${(ci.upper * 100).toFixed(1)}% over ${run.retrieval.queryCount} query(ies)), ${against} the ${floor}% adoption floor.`,
  };
};

// Peak process memory is not instrumented by this harness today — every run
// reports the same "not measured" factor rather than a guessed number.
const peakMemoryFactor = (): AdoptionFactor => ({
  label: "Peak memory",
  summary: "not measured",
  detail: `This harness records ingest/query latency and cost, not process RSS, so peak memory has no value to report for any backend yet.`,
});

const missingDataReasons = (
  run: BackendRun,
  peakMemory: AdoptionFactor,
): ReadonlyArray<string> => {
  const reasons: Array<string | undefined> = [
    peakMemory.summary === "not measured"
      ? "peak memory (no RSS instrumentation in this harness)"
      : undefined,
    run.provenance === "error"
      ? `speed and quality (the run errored: ${run.error ?? "no error message recorded"})`
      : undefined,
    run.provenance === "fixtured"
      ? "speed and quality (fixtured stand-in, no credential / not a live measurement)"
      : undefined,
  ];
  return reasons.filter((reason): reason is string => reason !== undefined);
};

const missingDataReasonFactor = (
  run: BackendRun,
  peakMemory: AdoptionFactor,
): AdoptionFactor => {
  const reasons = missingDataReasons(run, peakMemory);
  if (reasons.length === 0) {
    return {
      label: "Missing-data reason",
      summary: "none",
      detail: "Every factor above was measured; nothing is missing for this run.",
    };
  }
  return {
    label: "Missing-data reason",
    summary: reasons.length === 1 ? "peak memory" : `${reasons.length} factors`,
    detail: `Missing: ${reasons.join("; ")}.`,
  };
};

/**
 * Decides adopt/reject from a backend's measured run and builds the fixed,
 * four-factor rationale behind that call. Peak memory is always reported as
 * missing (see `peakMemoryFactor`) but never blocks adoption on its own —
 * only a non-`measured` run or a speed/quality factor outside its threshold
 * does. A known, disclosed gap is not the same as an unmet requirement.
 */
export const decideAdoptionRationale = (
  run: BackendRun,
): AdoptionRationale => {
  const speed = speedFactor(run);
  const quality = qualityFactor(run);
  const peakMemory = peakMemoryFactor();
  const missingDataReason = missingDataReasonFactor(run, peakMemory);

  const speedPasses =
    run.operational.queryLatencyP50Ms <= SPEED_ADOPT_CEILING_P50_MS;
  const qualityPasses =
    run.retrieval.recallAtK >= QUALITY_ADOPT_FLOOR_RECALL_AT_K;
  const isMeasured = run.provenance === "measured";

  const verdict: AdoptionVerdict =
    isMeasured && speedPasses && qualityPasses ? "adopt" : "reject";
  const verdictReason = !isMeasured
    ? `not a live measurement (provenance: ${run.provenance})`
    : !speedPasses && !qualityPasses
      ? "speed and quality both miss their thresholds"
      : !speedPasses
        ? "speed misses its threshold"
        : !qualityPasses
          ? "quality misses its threshold"
          : "speed and quality both meet their thresholds";

  return {
    verdict,
    verdictReason,
    factors: [speed, quality, peakMemory, missingDataReason],
  };
};

const detailsCell = (factor: AdoptionFactor): string =>
  `<details><summary>${factor.summary}</summary>${factor.detail}</details>`;

/**
 * One Markdown table row: backend name, verdict, then the four factors in
 * their fixed order.
 */
export const renderAdoptionRationaleRow = (
  run: BackendRun,
  rationale: AdoptionRationale,
): string => {
  const verdictLabel = rationale.verdict === "adopt" ? "Adopt" : "Reject";
  const cells = rationale.factors.map(detailsCell).join(" | ");
  return `| ${run.backend.name} | **${verdictLabel}** | ${cells} |`;
};

/**
 * The exhaustive per-backend table — one fixed-order line per backend with
 * all four factors expandable. Belongs in §7 Verification Data alongside the
 * other per-backend tables; §4 Verification Results keeps only the one-line
 * aggregate from `renderAdoptionVerdictSummary`, per the site-wide §4
 * character budget (see `published-pages.test.ts`).
 */
export const renderAdoptionRationaleSection = (
  runs: ReadonlyArray<BackendRun>,
): string => {
  if (runs.length === 0) return "";
  const header = `| Backend | Verdict | Speed | Quality | Peak memory | Missing-data reason |
| ------- | ------- | ----- | ------- | ----------- | -------------------- |`;
  const rows = runs
    .map((run) => renderAdoptionRationaleRow(run, decideAdoptionRationale(run)))
    .join("\n");
  return `**Adoption rationale.** One fixed-order line per backend — speed, quality, peak memory, missing-data reason — with the verdict that line supports. Expand a cell for the number behind it.

${header}
${rows}`;
};

/**
 * The §4-sized aggregate: one line naming how many backends would be
 * adopted at the fixed thresholds, pointing to the full per-backend
 * breakdown in §7. Keeps the decisive number in the concise overview
 * without repeating every expandable detail there.
 */
export const renderAdoptionVerdictSummary = (
  runs: ReadonlyArray<BackendRun>,
): string => {
  if (runs.length === 0) return "";
  const adopted = runs.filter(
    (run) => decideAdoptionRationale(run).verdict === "adopt",
  ).length;
  const speedCeiling = SPEED_ADOPT_CEILING_P50_MS;
  const qualityFloor = (QUALITY_ADOPT_FLOOR_RECALL_AT_K * 100).toFixed(0);
  return `**Adoption verdict.** ${adopted} of ${runs.length} backend(s) would be adopted at this run's speed (≤ ${speedCeiling} ms p50) and quality (≥ ${qualityFloor}% recall@k) thresholds; peak memory is not measured by this harness and does not gate adoption on its own. The per-backend speed / quality / peak memory / missing-data breakdown is in section 7, Verification Data.`;
};
