// Renders the local-inference 採否 (adoption) page: one row per saved
// comparison snapshot, its verdict and (when rejected) the fixed reason the
// comparison refused it, and — below the table — the safe reproduction
// command for each row, built only from its own engine version, model,
// fixture version, and runner version.

import { safeReproduceCommand } from "./reproduce";
import type { ComparisonSnapshot, ComparisonSnapshotFile } from "./snapshot";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const VERDICT_LABEL: Readonly<Record<ComparisonSnapshot["verdict"], string>> =
  {
    adopted: "採用",
    rejected: "不採用",
  };

const sortedById = (
  snapshots: ReadonlyArray<ComparisonSnapshot>,
): ReadonlyArray<ComparisonSnapshot> =>
  [...snapshots].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const TABLE_HEADER =
  "| ID | Engine version | Model | Fixture version | Runner version | 採否 | Reason |\n" +
  "| --- | --- | --- | --- | --- | --- | --- |";

const tableRow = (snapshot: ComparisonSnapshot): string =>
  `| ${escapeCell(snapshot.id)} | ${escapeCell(snapshot.engineVersion)} | ` +
  `${escapeCell(snapshot.model)} | ${escapeCell(snapshot.fixtureVersion)} | ` +
  `${escapeCell(snapshot.runnerVersion)} | ${VERDICT_LABEL[snapshot.verdict]} | ` +
  `${escapeCell(snapshot.reasonCode ?? "—")} |`;

const reproductionSection = (snapshot: ComparisonSnapshot): string =>
  `### ${escapeCell(snapshot.id)}\n\n` +
  "```sh\n" +
  `${safeReproduceCommand(snapshot)}\n` +
  "```";

/**
 * Renders the full adoption page Markdown from a parsed comparison snapshot
 * file. Rows are sorted by `id` so the output is independent of input order.
 */
export const renderAdoptionReport = (
  file: ComparisonSnapshotFile,
): string => {
  const snapshots = sortedById(file.snapshots);
  const table = [TABLE_HEADER, ...snapshots.map(tableRow)].join("\n");
  const sections = snapshots.map(reproductionSection).join("\n\n");

  return (
    `# Local inference adoption\n\n` +
    "This page is generated from a saved comparison snapshot by " +
    "`npm run local-inference:adoption` in `packages/tech`. Each row's " +
    "**採否** (adopted / rejected) column records that snapshot's comparison " +
    'verdict; a "不採用" row carries the fixed reason the comparison refused ' +
    "to adopt it. The **safe reproduction command** below each row is built " +
    "only from the row's own public engine version, model, fixture version, " +
    "and runner version — the same values already shown in the table — and " +
    "rendering is refused if any of those four values looks secret-like " +
    "(matching `/key|token|secret|password|credential|profile/i`).\n\n" +
    `${table}\n\n` +
    `## Safe reproduction commands\n\n` +
    `${sections}\n`
  );
};
