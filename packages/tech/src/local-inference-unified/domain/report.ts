// Renders the single, public comparison page: one table that integrates
// speed, quality and memory metrics with the failure reason for all four
// fixed engines, followed by one narrow table per dimension so a reader who
// only cares about one axis does not have to scan the wide table.

import {
  ENGINES,
  ENGINE_LABELS,
  GAP_LABELS,
  METRICS,
  METRIC_LABELS,
  metricsForDimension,
  type Dimension,
  type Measurement,
  type Run,
  type UnifiedResult,
} from "./types";

// Markdown table cells must not carry raw table syntax or HTML.
function cell(value: string): string {
  return value.replace(/[&<>|`*_[\]\\\r\n]/g, (char) =>
    char === "\n" || char === "\r" ? " " : `&#${char.charCodeAt(0)};`,
  );
}

function conditionText(condition: Run["condition"]): string {
  const keys = Object.keys(condition).sort();
  return keys.length === 0
    ? "(none stated)"
    : keys.map((key) => `${key}=${String(condition[key])}`).join("; ");
}

function measurementText(measurement: Measurement): string {
  return measurement.value === null
    ? `欠測 (${measurement.reason}) — ${GAP_LABELS[measurement.reason]}`
    : `${measurement.value} ${measurement.unit}`;
}

function failureText(run: Run): string {
  return run.failure ? run.failure.code : "—";
}

function orderedRows(result: UnifiedResult): Run[] {
  return ENGINES.map((engine) =>
    result.runs.find((run) => run.engine === engine),
  ).filter((run): run is Run => run !== undefined);
}

function missingEngines(rows: Run[]): string[] {
  return ENGINES.filter(
    (engine) => !rows.some((run) => run.engine === engine),
  ).map((engine) => ENGINE_LABELS[engine]);
}

function renderAllEnginesTable(rows: Run[]): string[] {
  const header = [
    "Engine",
    "Model",
    "Runtime",
    "Status",
    ...METRICS.map((name) => METRIC_LABELS[name]),
    "不採用理由 (failure code)",
  ];
  const lines = rows.map((run) => {
    const cells = [
      ENGINE_LABELS[run.engine],
      run.model,
      run.runtimeVersion,
      run.status,
      ...METRICS.map((name) => measurementText(run.metrics[name])),
      failureText(run),
    ].map((value) => cell(String(value)));
    return `| ${cells.join(" | ")} |`;
  });
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...lines,
  ];
}

const DIMENSION_HEADINGS: Readonly<Record<Dimension, string>> = {
  speed: "## Speed",
  quality: "## Quality",
  memory: "## Memory",
};

function renderDimensionTable(rows: Run[], dimension: Dimension): string[] {
  const metrics = metricsForDimension(dimension);
  const header = [
    "Engine",
    "Model",
    "Condition",
    ...metrics.map((name) => METRIC_LABELS[name]),
  ];
  const lines = rows.map((run) => {
    const cells = [
      ENGINE_LABELS[run.engine],
      run.model,
      conditionText(run.condition),
      ...metrics.map((name) => measurementText(run.metrics[name])),
    ].map((value) => cell(String(value)));
    return `| ${cells.join(" | ")} |`;
  });
  return [
    DIMENSION_HEADINGS[dimension],
    "",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...lines,
    "",
  ];
}

function renderFailureSection(rows: Run[]): string[] {
  const failed = rows.filter((run) => run.status === "failed");
  if (failed.length === 0) {
    return ["## Failure reasons", "", "No run was rejected (不採用なし).", ""];
  }
  const header = ["Engine", "Model", "不採用理由 (failure code)"];
  const lines = failed.map((run) => {
    const cells = [
      ENGINE_LABELS[run.engine],
      run.model,
      failureText(run),
    ].map((value) => cell(String(value)));
    return `| ${cells.join(" | ")} |`;
  });
  return [
    "## Failure reasons",
    "",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...lines,
    "",
  ];
}

/** Rows always appear in the fixed engine order, independent of input order. */
export function renderUnifiedMarkdown(result: UnifiedResult): string {
  const rows = orderedRows(result);
  const missing = missingEngines(rows);

  return [
    "# Local inference: speed, quality, memory and failure reasons",
    "",
    `Generated ${result.generatedAt} from input ${result.inputSha256}. Procedure: ${result.procedure}.`,
    "",
    "欠測理由: 未対応 (`UNSUPPORTED`), 失敗 (`MEASURE-FAILED`), 記録なし (`NO-FIELD`: field absent; `NOT-RUN`: measurement not run). Reasons belong to each metric; a run failure never overwrites them. A recorded zero remains a measured value.",
    "",
    "## All engines",
    "",
    "Every engine is one row, in the fixed order Ollama, llama.cpp, MLX, Strata. A missing metric (欠測) keeps its gap reason instead of a blank cell or a zero. A run that was not adopted into the comparison (不採用) carries one of eight fixed failure codes in the last column; a measured run shows `—` there because nothing was rejected.",
    "",
    ...renderAllEnginesTable(rows),
    "",
    ...renderDimensionTable(rows, "speed"),
    ...renderDimensionTable(rows, "quality"),
    ...renderDimensionTable(rows, "memory"),
    ...renderFailureSection(rows),
    ...(missing.length
      ? [`No result was recorded for: ${missing.join(", ")}.`, ""]
      : []),
  ].join("\n");
}
