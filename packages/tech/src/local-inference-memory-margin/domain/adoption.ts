import type { EngineMemoryMarginRow, FixedCapacityTier } from "./types";
import { formatMemoryMarginCell } from "./table";

function escape(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * Why a row is kept off the published adoption table despite having a
 * speed, quality and memory-margin cell to show.
 *
 * `ORIGIN-MISSING` — one or more of the three cells carries no `runId`, so
 * there is nothing to compare.
 * `ORIGIN-MISMATCH` — the three `runId`s are not all equal: the cells were
 * produced by different runs (different engine/model/fixture/runnerVersion/
 * targetCommit, per qmu/research#269's `reproductionIdentity`) stitched into
 * one row, which would publish a memory margin that was never actually
 * observed alongside that speed and quality figure.
 */
export type AdoptionRejectionReason = "ORIGIN-MISSING" | "ORIGIN-MISMATCH";

export type AdoptionDecision =
  | { status: "adopted" }
  | { status: "rejected"; reason: AdoptionRejectionReason };

/**
 * `EngineMemoryMarginRow` plus the `runId` each of its three already-
 * formatted/measured cells came from. `runId` is a plain string here, not
 * imported from qmu/research#269 — this module takes the identity's output,
 * the same way `EngineMemoryMarginRow` takes an already-normalized reading
 * without importing the code that produced it.
 */
export type EngineAdoptionRow = Readonly<
  EngineMemoryMarginRow & {
    speedRunId: string | null;
    qualityRunId: string | null;
    memoryRunId: string | null;
  }
>;

/**
 * Adopts a row only when its speed, quality and memory-margin cells all
 * came from the same run. A row with any missing `runId` is rejected
 * (`ORIGIN-MISSING`) rather than treated as a free pass — an absent origin
 * is not evidence the three cells agree, it is an absence of evidence.
 */
export function decideAdoption(row: EngineAdoptionRow): AdoptionDecision {
  const ids = [row.speedRunId, row.qualityRunId, row.memoryRunId];
  if (ids.some((id) => id === null || id.length === 0)) {
    return { status: "rejected", reason: "ORIGIN-MISSING" };
  }
  const [first, ...rest] = ids as ReadonlyArray<string>;
  if (rest.some((id) => id !== first)) {
    return { status: "rejected", reason: "ORIGIN-MISMATCH" };
  }
  return { status: "adopted" };
}

function decisionCell(decision: AdoptionDecision): string {
  return decision.status === "adopted" ? "採用" : `不採用 (${decision.reason})`;
}

/**
 * Renders one deterministic Markdown table joining, per engine, the speed
 * and quality cells, the memory-margin cell `renderMemoryMarginTable`
 * already renders, and a 採否 (adopt/reject) column computed by
 * `decideAdoption`. A rejected row still shows its margin cell — rejection
 * means "do not treat these three figures as describing one run", not "hide
 * the numbers" — so a reader can see what was excluded and why.
 */
export function renderAdoptionTable(
  rows: ReadonlyArray<EngineAdoptionRow>,
  tiers?: ReadonlyArray<FixedCapacityTier>,
  toleranceRatio?: number,
): string {
  const header = ["Engine", "Speed", "Quality", "Memory margin", "採否"];
  const divider = header.map(() => "---");
  const body = rows.map((row) => {
    const cells = [
      escape(row.engine),
      escape(row.speed),
      escape(row.quality),
      formatMemoryMarginCell(row, tiers, toleranceRatio),
      decisionCell(decideAdoption(row)),
    ];
    return `| ${cells.join(" | ")} |`;
  });
  return [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...body,
  ].join("\n");
}
