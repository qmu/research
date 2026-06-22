import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { TASKS } from "../llm-benchmark/dataset";
import { gradeAnswer } from "../llm-benchmark/domain/grade";
import { summarize } from "../llm-benchmark/domain/score";
import { renderReport } from "../llm-benchmark/domain/report";
import type { LlmClient } from "../vendors/llm/types";
import { createAnthropicClient, DEFAULT_MODEL } from "../vendors/llm/anthropic";
import { createFixtureClient } from "../vendors/llm/fixture";

// Thin entrypoint: choose a client, run the task set through the pure domain
// logic, render the result page, and write it. No benchmark logic lives here.

const buildClient = (): LlmClient => {
  const useFixture =
    process.argv.includes("--fixture") || !process.env.ANTHROPIC_API_KEY;
  if (useFixture) {
    if (!process.argv.includes("--fixture")) {
      process.stderr.write(
        "ANTHROPIC_API_KEY not set; using the deterministic fixture model.\n",
      );
    }
    const canned = new Map(TASKS.map((task) => [task.prompt, task.expected]));
    return createFixtureClient(canned);
  }
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  return createAnthropicClient(model, process.env.ANTHROPIC_API_KEY ?? "");
};

const main = async (): Promise<void> => {
  const client = buildClient();

  const grades = [];
  for (const task of TASKS) {
    const output = await client.generateAnswer(task.prompt);
    grades.push(gradeAnswer(task, output));
  }

  const result = summarize(client.model, grades);
  const generatedAt = new Date().toISOString();
  const page = renderReport(result, generatedAt);

  const outputPath =
    process.env.OUTPUT_PATH ??
    resolve(process.cwd(), "../../docs/research-reports/llm-benchmark.md");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, page, "utf8");

  process.stdout.write(
    `${result.model}: ${result.correct}/${result.total} correct (${(
      result.accuracy * 100
    ).toFixed(1)}%)\nwrote ${outputPath}\n`,
  );
};

main().catch((error: unknown) => {
  process.stderr.write(`benchmark failed: ${String(error)}\n`);
  process.exitCode = 1;
});
