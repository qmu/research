/**
 * Report which generational directions would change label if the section's gate
 * used the standard error of the difference of means instead of the summed
 * run-to-run dispersion.
 *
 * This is step 3 of ticket `20260801124500` — the material output. The code
 * change is small; what the decision needs is the measured consequence, read off
 * the committed frames rather than argued from intuition.
 *
 * **It changes nothing.** It reads a frame artifact, computes both rules, and
 * prints the disagreements. The published gate, the rendered article and every
 * committed artifact are untouched, because which statistic gates the
 * `indistinguishable` label is the owner's decision (ADR 0008).
 *
 *   npm run generational-precision                       # the current frame
 *   npm run generational-precision -- --band 1.5         # at another band
 *   npm run generational-precision -- --frame <path>     # any frame artifact
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  STAT_METRICS,
  findGenerationPairs,
} from "../llm-model-comparison/domain/generational-delta";
import {
  DEFAULT_BAND_MULTIPLIER,
  comparePrecisionRules,
  trialsToResolve,
} from "../llm-model-comparison/domain/generational-precision";
import { MODELS } from "../llm-model-comparison/models";
import type { ConfigRun } from "../llm-model-comparison/domain/types";

// cwd is `packages/tech`, the convention every other runner here uses.
const DEFAULT_FRAME =
  "../../docs/research-reports/llm-model-comparison.data.json";

const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

const readFrame = (path: string): ReadonlyArray<ConfigRun> => {
  const raw = path.endsWith(".gz")
    ? gunzipSync(readFileSync(path)).toString("utf8")
    : readFileSync(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("configs" in parsed) ||
    !Array.isArray((parsed as { configs: unknown }).configs)
  ) {
    throw new Error(`Frame has no configs array: ${path}`);
  }
  return (parsed as { configs: ReadonlyArray<ConfigRun> }).configs;
};

const framePath = argument("frame") ?? resolve(process.cwd(), DEFAULT_FRAME);
const multiplier = Number(argument("band") ?? DEFAULT_BAND_MULTIPLIER);

const configs = readFrame(framePath);
const measured = configs.filter((config) => config.provenance === "measured");
const byId = new Map<string, ConfigRun[]>();
for (const config of measured) {
  byId.set(config.id, [...(byId.get(config.id) ?? []), config]);
}

type Row = Readonly<{
  pair: string;
  effort: string;
  metric: string;
  from: string;
  to: string;
  detail: string;
}>;

// The frame artifact records run results, not registry metadata — its config
// rows carry no `generation`/`supersedes`. Pairing therefore comes from MODELS,
// which is where the former→new relation actually lives.
const pairs = findGenerationPairs(MODELS);

const rows: Row[] = [];
let comparedMetrics = 0;
let undecidable = 0;

for (const pair of pairs) {
  for (const current of byId.get(pair.currentId) ?? []) {
    const previous = (byId.get(pair.previousId) ?? []).find(
      (row) => row.effort === current.effort,
    );
    if (previous === undefined) continue;
    for (const spec of STAT_METRICS) {
      const before = previous.stats[spec.statKey];
      const after = current.stats[spec.statKey];
      const input = {
        previousMean: before.mean,
        currentMean: after.mean,
        previousStdDev: before.stdDev,
        currentStdDev: after.stdDev,
        previousTrials: before.n,
        currentTrials: after.n,
      };
      const comparison = comparePrecisionRules(input, multiplier);
      comparedMetrics += 1;
      if (comparison.precisionVerdict === "undecidable") {
        undecidable += 1;
        continue;
      }
      if (!comparison.differs) continue;
      const direction =
        spec.better === "higher"
          ? comparison.difference > 0
            ? "improved"
            : "regressed"
          : comparison.difference < 0
            ? "improved"
            : "regressed";
      const restores = comparison.precisionVerdict === "clears";
      rows.push({
        pair: `${pair.previousId} → ${pair.currentId}`,
        effort: current.effort,
        metric: spec.title,
        from: restores ? "indistinguishable" : direction,
        to: restores ? direction : "indistinguishable",
        detail:
          `diff ${comparison.difference.toFixed(3)} ${spec.unit}` +
          `, dispersion band ${comparison.dispersionBand.toFixed(3)}` +
          `, ${multiplier}x se band ${(comparison.precisionBand ?? 0).toFixed(3)}` +
          `, n=${before.n}/${after.n}`,
      });
    }
  }
}

console.log(`frame: ${framePath}`);
console.log(`band: ${multiplier} x se_diff`);
console.log(
  `compared ${comparedMetrics} measured generational metrics; ${undecidable} undecidable (n < 2 on a side)`,
);
console.log(`label changes: ${rows.length}`);
for (const row of rows) {
  console.log(
    `  ${row.pair} [${row.effort}] ${row.metric}: ${row.from} -> ${row.to} (${row.detail})`,
  );
}

// The lever the current gate does not have: for everything still suppressed,
// how many trials per side would resolve it?
const suppressed: Array<{ label: string; trials: number }> = [];
for (const pair of pairs) {
  for (const current of byId.get(pair.currentId) ?? []) {
    const previous = (byId.get(pair.previousId) ?? []).find(
      (row) => row.effort === current.effort,
    );
    if (previous === undefined) continue;
    for (const spec of STAT_METRICS) {
      const before = previous.stats[spec.statKey];
      const after = current.stats[spec.statKey];
      const input = {
        previousMean: before.mean,
        currentMean: after.mean,
        previousStdDev: before.stdDev,
        currentStdDev: after.stdDev,
        previousTrials: before.n,
        currentTrials: after.n,
      };
      const comparison = comparePrecisionRules(input, multiplier);
      if (comparison.precisionVerdict !== "within") continue;
      const needed = trialsToResolve(input, multiplier);
      if (needed === null) continue;
      suppressed.push({
        label: `${pair.previousId} → ${pair.currentId} [${current.effort}] ${spec.title}`,
        trials: needed,
      });
    }
  }
}
suppressed.sort((a, b) => a.trials - b.trials);
console.log(
  `\nstill suppressed but resolvable by sampling: ${suppressed.length} (cheapest first)`,
);
for (const entry of suppressed.slice(0, 15)) {
  console.log(`  ${entry.trials} trials/side — ${entry.label}`);
}
