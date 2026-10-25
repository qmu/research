import { parseInferenceReport, type Metric } from "./validation";
export { gapReasons, parseInferenceReport } from "./validation";
export type { InferenceRow, InferenceReport } from "./validation";

// Encode user text as text, never raw HTML or Markdown table structure.
function cell(value: string): string {
  return value.replace(/[&<>|`*_[\]\\\r\n]/g, (char) =>
    char === "\n" || char === "\r" ? " " : `&#${char.charCodeAt(0)};`,
  );
}
function number(value: Metric): string {
  return value.value === null ? `n/a (${value.reason})` : String(value.value);
}
export function renderInferenceReport(input: unknown): string {
  const report = parseInferenceReport(input);
  const rows = [...report.runs].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  return [
    "# Local inference comparison",
    "",
    report.fixture
      ? "Fixture only — synthetic values; no engines were measured."
      : "Imported measurements — conditions are recorded per row; no cross-condition ranking is inferred.",
    "",
    "Speed: completion tokens / client first-to-last-token seconds (tok/s). Quality: task score in [0, 1], higher is better. Condition identifies the prompt, model revision/weight digest, runtime version, sampling, cache and quality rubric; compare only matching conditions. Missing metrics retain their reason; zero is a measured value.",
    "",
    "| Run | Backend | Model | Quantization | Hardware | Condition | Speed (tok/s) | Quality (0–1) |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${[row.id, row.backend, row.model, row.quantization, row.hardware, row.condition, number(row.speed), number(row.quality)].map(cell).join(" | ")} |`,
    ),
    "",
  ].join("\n");
}
