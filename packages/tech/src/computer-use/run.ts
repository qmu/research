import type { ComputerUseClient, TaskAttempt } from "../vendors/llm/types";
import {
  createAnthropicComputerUseClient,
  createGoogleComputerUseClient,
  createOpenAiComputerUseClient,
} from "../vendors/llm/computer-use";
import { createFixtureComputerUseClient } from "../vendors/llm/fixture";
import { TASK_SUITE } from "./domain/manifest";
import {
  aggregateRunStats,
  costFromTokens,
  meanActionLatencyMs,
} from "./domain/score";
import type {
  BrowserTask,
  ComputerUseCallRecord,
  ComputerUseModelCard,
  ComputerUseModelRun,
  ComputerUseResult,
  Provenance,
} from "./domain/types";
import { COMPUTER_USE_MODELS, HARNESS, NON_SUBJECT_PROVIDERS } from "./models";

export type ComputerUseRunOptions = Readonly<{
  fixture: boolean;
  trials: number;
  modelIds?: ReadonlyArray<string>;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

// Estimate premises (stated in the report and the design proposal): a task is a
// multi-turn observe→think→act loop; each turn is one model call whose input is
// dominated by a screenshot. These are deliberate round-number premises, not
// measurements — the real run reports the actual usage.
const TURNS_PER_TASK = 15;
const INPUT_TOKENS_PER_TURN = 1_800;
const OUTPUT_TOKENS_PER_TURN = 200;
const COST_CEILING_USD = 40;

const clientFor = (
  card: ComputerUseModelCard,
  fixture: boolean,
): ComputerUseClient => {
  if (fixture) return createFixtureComputerUseClient(card.apiModelId);
  const keyEnv = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
  }[card.provider];
  const key = process.env[keyEnv];
  if (!key) {
    throw new Error(`${keyEnv} is required for a real ${card.provider} run.`);
  }
  if (card.provider === "anthropic") {
    return createAnthropicComputerUseClient(
      card.apiModelId,
      key,
      card.toolVersion,
    );
  }
  if (card.provider === "openai") {
    return createOpenAiComputerUseClient(card.apiModelId, key);
  }
  return createGoogleComputerUseClient(card.apiModelId, key);
};

const scoreAttempt = (
  attempt: TaskAttempt,
  task: BrowserTask,
  repetition: number,
  card: ComputerUseModelCard,
): ComputerUseCallRecord => ({
  taskId: task.id,
  category: task.category,
  repetition,
  succeeded: attempt.succeeded,
  steps: attempt.actions.length,
  wallClockMs: attempt.wallClockMs,
  latencyPerActionMs: meanActionLatencyMs(
    attempt.actions.map((action) => action.latencyMs),
  ),
  costUsd: costFromTokens(
    attempt.inputTokens,
    attempt.outputTokens,
    card.inputCostPerMTok,
    card.outputCostPerMTok,
  ),
  recovered: attempt.actions.some((action) => action.recovered),
});

const attemptOnce = async (
  client: ComputerUseClient,
  task: BrowserTask,
  repetition: number,
  card: ComputerUseModelCard,
): Promise<ComputerUseCallRecord> => {
  const attempt = await client.attemptTask({
    id: task.id,
    goal: task.goal,
    startUrl: `${TASK_SUITE.siteBase}${task.startPath}`,
  });
  return scoreAttempt(attempt, task, repetition, card);
};

const aggregate = (
  card: ComputerUseModelCard,
  provenance: Provenance,
  measuredAt: string,
  trials: number,
  calls: ReadonlyArray<ComputerUseCallRecord>,
  error?: string,
): ComputerUseModelRun => ({
  id: card.id,
  provider: card.provider,
  modelName: card.modelName,
  apiModelId: card.apiModelId,
  toolVersion: card.toolVersion,
  apiSurface: card.apiSurface,
  inputCostPerMTok: card.inputCostPerMTok,
  outputCostPerMTok: card.outputCostPerMTok,
  source: card.source,
  provenance,
  measuredAt,
  trialsRequested: trials,
  stats: aggregateRunStats(calls),
  calls,
  ...(error === undefined ? {} : { error }),
});

const selectedCards = (
  modelIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<ComputerUseModelCard> =>
  modelIds === undefined || modelIds.length === 0
    ? COMPUTER_USE_MODELS
    : COMPUTER_USE_MODELS.filter((card) => modelIds.includes(card.id));

export const runComputerUse = async (
  options: ComputerUseRunOptions,
): Promise<ComputerUseResult> => {
  const trials = Math.max(1, Math.trunc(options.trials));
  const generatedAt = options.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const runs: ComputerUseModelRun[] = [];
  for (const card of selectedCards(options.modelIds)) {
    try {
      const client = clientFor(card, options.fixture);
      const calls: ComputerUseCallRecord[] = [];
      for (let repetition = 0; repetition < trials; repetition += 1) {
        for (const task of TASK_SUITE.tasks) {
          calls.push(await attemptOnce(client, task, repetition, card));
        }
      }
      runs.push(
        aggregate(
          card,
          options.fixture ? "fixtured" : "measured",
          generatedAt,
          trials,
          calls,
        ),
      );
    } catch (error) {
      runs.push(
        aggregate(card, "error", generatedAt, trials, [], String(error)),
      );
    }
  }
  return {
    generatedAt,
    fixture: options.fixture,
    trials,
    harness: HARNESS,
    suiteVersion: TASK_SUITE.version,
    runs,
    nonSubjects: NON_SUBJECT_PROVIDERS,
    artifactPath: "computer-use-comparison.data.json",
  };
};

export const estimateComputerUse = (
  modelIds: ReadonlyArray<string> | undefined,
  trials: number,
): string => {
  const trialCount = Math.max(1, Math.trunc(trials));
  const tasks = TASK_SUITE.tasks.length;
  const cards = selectedCards(modelIds);
  const costForCard = (card: ComputerUseModelCard): number => {
    const turns = tasks * trialCount * TURNS_PER_TASK;
    return costFromTokens(
      turns * INPUT_TOKENS_PER_TURN,
      turns * OUTPUT_TOKENS_PER_TURN,
      card.inputCostPerMTok,
      card.outputCostPerMTok,
    );
  };
  const lines = cards.map((card) => {
    const attempts = tasks * trialCount;
    return `  ${card.id}: ~$${costForCard(card).toFixed(2)} for ${attempts} task attempt(s) (${tasks} task(s) × ${trialCount} repetition(s), ~${TURNS_PER_TASK} turns/task)`;
  });
  const total = cards.reduce((sum, card) => sum + costForCard(card), 0);
  return [
    "computer-use estimate (real run; per-turn token counts are premises, not measurements):",
    ...lines,
    `  total: ~$${total.toFixed(2)} (agreed ceiling: $${COST_CEILING_USD}/trial — stop for re-approval above it)`,
    "Screenshots dominate input tokens; more repetitions narrow variance but re-pay the full multi-turn cost.",
    "No persistent provider resources are created; the browser session is ephemeral and screenshots are discarded.",
  ].join("\n");
};
