import { diffQuality } from "../../local-inference-quality-diff/domain/diff.js";
import { evaluateAdoption } from "./evaluate.js";
import { parseReading } from "./readings.js";
import type { AdoptionVerdict, Engine, UseCase } from "./types.js";

type QualityRun = ReturnType<typeof diffQuality>["runs"][number];
export type QualityAdoption = AdoptionVerdict & {
  model: string;
  qualityDecision: AdoptionVerdict["decision"];
  fixtures: QualityRun["fixtures"];
};

/** A fixed fixture set must remain comparable and pass before adoption.
 * Regression/failure dominates missing evidence. Speed cannot compensate. */
function qualityDecision(run: QualityRun): AdoptionVerdict["decision"] {
  if (
    run.fixtures.some(
      (f) => f.change === "regressed" || f.after?.verdict === "fail",
    )
  )
    return "reject";
  if (
    !run.fixtures.length ||
    run.fixtures.some(
      (f) =>
        !["unchanged", "improved"].includes(f.change) ||
        f.after?.verdict !== "pass",
    )
  )
    return "undetermined";
  return "adopt";
}

/** Read metrics and judgments from the same engine/model run. Never join an
 * unlabelled speed file to a different model's quality evidence. No writes. */
export function evaluateQualityAdoption(
  before: unknown,
  after: unknown,
  useCase: UseCase,
): QualityAdoption[] {
  const diff = diffQuality(before, after); // validates identities and judgments
  const current = (after as { runs: Array<Record<string, unknown>> }).runs;
  return diff.runs.map((run) => {
    const source = current.find(
      (r) => r.engine === run.engine && r.model === run.model,
    );
    const raw = source?.metrics;
    if (
      raw !== undefined &&
      (!raw || typeof raw !== "object" || Array.isArray(raw))
    )
      throw new Error("Invalid metrics");
    const metrics = (raw ?? {}) as Record<string, unknown>;
    const reading = (id: string) => {
      const value = parseReading(
        source?.status !== "measured"
          ? {
              value: null,
              reason:
                source?.status === "failed" ? "MEASURE-FAILED" : "NOT-RUN",
            }
          : (metrics[id] ?? { value: null, reason: "NO-FIELD" }),
        run.engine,
        id,
      );
      if (value.value !== null && value.value < 0)
        throw new Error("Negative metric");
      return value;
    };
    const judgments = run.fixtures.map((f) => f.after);
    const known =
      judgments.length > 0 &&
      judgments.every((q) => q && q.verdict !== "undetermined");
    const verdict = evaluateAdoption(useCase, run.engine as Engine, {
      ttft: reading("ttft"),
      tps: reading("tps"),
      peakRss: reading("peak_rss"),
      quality: known
        ? {
            value:
              judgments.filter((q) => q?.verdict === "pass").length /
              judgments.length,
            unit: "ratio",
          }
        : { value: null, reason: "NO-FIELD" },
    });
    const gate = qualityDecision(run);
    const decision =
      verdict.decision === "reject" || gate === "reject"
        ? "reject"
        : verdict.decision === "undetermined" || gate === "undetermined"
          ? "undetermined"
          : "adopt";
    return {
      ...verdict,
      decision,
      model: run.model,
      qualityDecision: gate,
      fixtures: run.fixtures,
    };
  });
}

function cell(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/[\r\n]/g, " ")
    .replace(/`/g, "&#96;");
}

export function renderQualityAdoption(
  rows: readonly QualityAdoption[],
): string {
  return [
    "| Engine / model | Adoption | Metric thresholds | Fixture quality gate | Fixture differences |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((row) => {
      const metrics = row.rules
        .map(
          (r) =>
            `${r.metric}: ${r.outcome} (${r.reading.value === null ? r.reading.reason : `${r.reading.value} ${r.reading.unit}`})`,
        )
        .join("; ");
      const fixtures =
        row.fixtures
          .map(
            (f) =>
              `${f.fixtureId}: ${f.change} (${f.before?.verdict ?? "missing"} → ${f.after?.verdict ?? "missing"})${f.after?.reason ? `: ${f.after.reason}` : ""}`,
          )
          .join("; ") || "NO-FIXTURES";
      return `| ${cell(row.engine)} / ${cell(row.model)} | ${row.decision} | ${cell(metrics)} | ${row.qualityDecision} | ${cell(fixtures)} |`;
    }),
    "",
  ].join("\n");
}
