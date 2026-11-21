// Renders the public local-inference adoption (採否) page: one row per
// saved comparison configuration, its verdict and reproduction id, and —
// below the table — a safe reproduction command per row that carries the
// same id, so a reader can go from a row straight to a runnable command for
// that exact configuration.

import { reproductionCommand } from "./reproduction-command";
import type { AdoptionRow } from "./adoption-row";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const VERDICT_LABEL: Readonly<Record<AdoptionRow["verdict"], string>> = {
  adopted: "採用",
  rejected: "不採用",
};

const sortedByReproductionId = (
  rows: ReadonlyArray<AdoptionRow>,
): ReadonlyArray<AdoptionRow> =>
  [...rows].sort((a, b) =>
    a.reproductionId < b.reproductionId
      ? -1
      : a.reproductionId > b.reproductionId
        ? 1
        : 0,
  );

const TABLE_HEADER =
  "| Reproduction ID | Engine | Model | Fixture | Runner version | 採否 | Reason |\n" +
  "| --- | --- | --- | --- | --- | --- | --- |";

const tableRow = (row: AdoptionRow): string =>
  `| [${escapeCell(row.reproductionId)}](#${row.reproductionId}) | ${escapeCell(row.engine)} | ` +
  `${escapeCell(row.model)} | ${escapeCell(row.fixture)} | ` +
  `${escapeCell(row.runnerVersion)} | ${VERDICT_LABEL[row.verdict]} | ` +
  `${escapeCell(row.reasonCode ?? "—")} |`;

const reproductionSection = (row: AdoptionRow): string =>
  `### ${escapeCell(row.reproductionId)}\n\n` +
  "```sh\n" +
  `${reproductionCommand(row)}\n` +
  "```";

/**
 * Renders the full adoption page Markdown from parsed adoption rows. Rows
 * are sorted by reproductionId so the output is independent of input order.
 */
export const renderAdoptionPage = (
  rows: ReadonlyArray<AdoptionRow>,
): string => {
  const sorted = sortedByReproductionId(rows);
  const table = [TABLE_HEADER, ...sorted.map(tableRow)].join("\n");
  const sections = sorted.map(reproductionSection).join("\n\n");

  return (
    "# Local inference adoption\n\n" +
    "Each row's **Reproduction ID** is a stable identifier derived only from " +
    "that row's engine, model, fixture, runner version, and target commit — " +
    "the same five conditions used to build the **reproduction command** " +
    "below the table. The id links from the table straight to its command, " +
    "and the command itself carries the id via `--reproduction-id`, so a " +
    "reader can confirm the command they are about to run reproduces the " +
    "exact row they started from. The **採否** (adopted / rejected) column " +
    'records that row\'s comparison verdict; a "不採用" row carries the ' +
    "fixed reason the comparison refused to adopt it.\n\n" +
    `${table}\n\n` +
    "## Reproduction commands\n\n" +
    `${sections}\n`
  );
};
