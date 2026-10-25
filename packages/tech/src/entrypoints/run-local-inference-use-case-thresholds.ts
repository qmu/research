import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { evaluateAllEngines } from "../local-inference-use-case-thresholds/domain/evaluate.js";
import { parseReadings } from "../local-inference-use-case-thresholds/domain/readings.js";
import { renderVerdictTable } from "../local-inference-use-case-thresholds/domain/report.js";
import { useCases } from "../local-inference-use-case-thresholds/domain/catalog.js";

const defaultFixture = fileURLToPath(
  new URL(
    "../local-inference-use-case-thresholds/fixtures/example-metrics.json",
    import.meta.url,
  ),
);

try {
  const [metricsPath, useCaseId, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error("arguments");
  const raw = await readFile(metricsPath ?? defaultFixture, "utf8");
  const readings = parseReadings(JSON.parse(raw));
  const selected = useCaseId
    ? useCases.filter((useCase) => useCase.id === useCaseId)
    : useCases;
  if (useCaseId && selected.length === 0)
    throw new Error(`unknown use case "${useCaseId}"`);
  if (!metricsPath)
    console.log(
      "No metrics path given; printing the fixture example (synthetic, not a measured result).\n",
    );
  console.log(
    "Metric-only policy example: fixture quality changes are not checked. Use local-inference-quality-adoption for saved fixture evidence.\n",
  );
  for (const useCase of selected) {
    const verdicts = evaluateAllEngines(useCase, readings);
    console.log(renderVerdictTable(useCase.label, verdicts));
    console.log("");
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : error,
    "\nUsage: npm run local-inference-thresholds -- [readings.json] [use-case-id]",
  );
  process.exitCode = 1;
}
