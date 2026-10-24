import { TASKS } from "./dataset";
import { gradeAnswer } from "./domain/grade";
import { summarize } from "./domain/score";
import type { BenchmarkResult } from "./domain/types";
import type { LlmClient } from "../vendors/llm/types";
import { createAnthropicClient, DEFAULT_MODEL } from "../vendors/llm/anthropic";
import { createFixtureClient } from "../vendors/llm/fixture";

export type LlmBenchmarkRunOptions = Readonly<{
  /** The keyless, deterministic dry-run path: no external API call. */
  fixture: boolean;
}>;

/**
 * The timestamp stamped into the fixture report, so the keyless page is
 * byte-stable across runs (same convention as the rag-benchmark fixture).
 */
export const FIXTURE_GENERATED_AT = "2026-01-01T00:00:00.000Z";

export const resolveGeneratedAt = (fixture: boolean): string =>
  fixture ? FIXTURE_GENERATED_AT : new Date().toISOString();

const buildClient =(fixture: boolean): LlmClient => {
  if (fixture) {
    const canned = new Map(TASKS.map((task) => [task.prompt, task.expected]));
    return createFixtureClient(canned);
  }
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  return createAnthropicClient(model, process.env.ANTHROPIC_API_KEY ?? "");
};

// Run the fixed task set through the pure grading/scoring logic. On the
// fixture path, the client answers from a canned prompt→expected map, so the
// same TASKS input always produces the same BenchmarkResult with no network
// call and no credentials.
export const runLlmBenchmark = async (
  options: LlmBenchmarkRunOptions,
): Promise<BenchmarkResult> => {
  const client = buildClient(options.fixture);
  const grades = [];
  for (const task of TASKS) {
    const output = await client.generateAnswer(task.prompt);
    grades.push(gradeAnswer(task, output));
  }
  return summarize(client.model, grades);
};
