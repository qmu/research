import {
  renderScatterChart,
} from "../../research-report/domain/scatter-chart.js";
import { onlyVerifiedRuns } from "./verified-runs.js";
import type { VerifiedLatencyMemoryRun } from "./verified-runs.js";
import type { LatencyMemoryRun } from "./types.js";

export type LatencyMemoryScatterSection = Readonly<{
  markdown: string;
  verifiedCount: number;
  excludedCount: number;
}>;

const groupByEngine = (
  runs: ReadonlyArray<VerifiedLatencyMemoryRun>,
): ReadonlyArray<readonly [string, VerifiedLatencyMemoryRun[]]> => {
  const byEngine = new Map<string, VerifiedLatencyMemoryRun[]>();
  for (const run of runs) {
    const group = byEngine.get(run.engine);
    if (group === undefined) {
      byEngine.set(run.engine, [run]);
    } else {
      group.push(run);
    }
  }
  return [...byEngine.entries()];
};

/**
 * Renders the 初回遅延×ピークRSS (initial delay × peak RSS) scatter plot as a
 * standalone Markdown section, plotting only `verified` runs.
 *
 * This is deliberately additive to, and independent of, the speed/quality/
 * memory-margin adoption table other local-inference work builds (e.g.
 * qmu/research#205's per-use-case thresholds and qmu/research#271/#275/#276's
 * fixed-tier memory margin): that table answers "does this engine clear a
 * use case's threshold", a pass/fail verdict per metric. This section answers
 * a different question — "across the runs we trust, where does each engine
 * land on delay vs. memory" — as a scatter, with no threshold, ceiling, or
 * verdict drawn on it. Nothing here computes or renders an adoption verdict,
 * so it cannot duplicate or contradict that table.
 */
export const renderLatencyMemoryScatterSection = (
  runs: ReadonlyArray<LatencyMemoryRun>,
  options: Readonly<{ id?: string }> = {},
): LatencyMemoryScatterSection => {
  const verified = onlyVerifiedRuns(runs);
  const excludedCount = runs.length - verified.length;

  if (verified.length === 0) {
    return {
      markdown: `**初回遅延×ピークRSS散布図**\n\n検証済みrunが無いため描画できない（${runs.length} 件すべて未検証）。`,
      verifiedCount: 0,
      excludedCount,
    };
  }

  const series = groupByEngine(verified).map(([engine, group]) => ({
    id: engine,
    label: engine,
    points: group.map((run) => ({
      label: run.label,
      x: run.reading.initialDelayMs,
      y: run.reading.peakRssMiB,
    })),
  }));

  const svg = renderScatterChart({
    id: options.id ?? "local-inference-latency-memory-scatter",
    title: "初回遅延×ピークRSS散布図（検証済みrunのみ）",
    description: `検証済みrun ${verified.length} 件の初回遅延とピークRSSの関係。未検証の ${excludedCount} 件は除外した。`,
    xLabel: "初回遅延 (ms)",
    yLabel: "ピークRSS (MiB)",
    xDigits: 0,
    yDigits: 0,
    series,
  });

  const caption =
    excludedCount > 0
      ? `検証済みrun ${verified.length} 件を表示。未検証のため ${excludedCount} 件を除外した。`
      : `検証済みrun ${verified.length} 件を表示。`;

  return {
    markdown: `**初回遅延×ピークRSS散布図**\n\n${svg}\n\n${caption} 既存の速度・品質・メモリ余白の採否表とは独立した補助図であり、採否判定は変更しない。`,
    verifiedCount: verified.length,
    excludedCount,
  };
};
