// Renders the local-inference comparison page from a validated common JSON
// record. Only fields already allowlisted by `parseComparisonFile` reach
// this module, so the page can display them directly: there is no raw
// command, credential, path, or URL left in an `InferenceRun` to accidentally
// print.

import type { ComparisonFile, InferenceRun } from "./record";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const describeModelCondition = (run: InferenceRun): string =>
  `${run.modelCondition.model} (${run.modelCondition.quantization}) — ${run.modelCondition.condition}`;

const describeRunner = (run: InferenceRun): string =>
  `${run.runner.name} ${run.runner.version}`;

const renderRow = (run: InferenceRun): string =>
  [
    "",
    escapeCell(run.backend),
    escapeCell(describeModelCondition(run)),
    escapeCell(describeRunner(run)),
    `\`${run.commandFingerprint}\``,
    "",
  ].join(" | ").trim();

const TABLE_HEADER =
  "| Backend | Model condition | Runner | Command fingerprint |\n" +
  "| --- | --- | --- | --- |";

/**
 * Render the comparison table: one row per run, sorted by `id` (code-unit
 * order, independent of input order), header-only when there are no runs.
 */
export const renderComparisonTable = (file: ComparisonFile): string => {
  if (file.runs.length === 0) {
    return `${TABLE_HEADER}\n`;
  }
  const sorted = [...file.runs].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  return `${TABLE_HEADER}\n${sorted.map(renderRow).join("\n")}\n`;
};

const PAGE_INTRO = `# Local inference comparison

This page is generated from the common local-inference JSON record by
\`npm run local-inference:render\` in \`packages/tech\`. Each row shows only
the non-secret reproduction conditions for that run: the model condition
(model, quantization, and run condition), the runner name and version, and a
versioned SHA-256 fingerprint of the run's command. The fingerprint is
computed after secrets, filesystem paths, and URLs are redacted from the
command's arguments, and the original command is never stored — see
[Local inference JSON](./local-inference-format) for the record format and
exactly what is redacted before hashing.
`;

/** Render the full comparison page, title and intro included. */
export const renderComparisonPage = (file: ComparisonFile): string =>
  `${PAGE_INTRO}\n${renderComparisonTable(file)}`;
