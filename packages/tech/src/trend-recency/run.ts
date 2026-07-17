import type {
  CompletionClient,
  GroundedAnswerClient,
} from "../vendors/llm/types";
import {
  createAnthropicCompletionClient,
  createAnthropicGroundedClient,
} from "../vendors/llm/anthropic";
import { createFixtureGroundedAnswerClient } from "../vendors/llm/fixture";
import {
  createGoogleCompletionClient,
  createGoogleGroundedClient,
} from "../vendors/llm/google";
import { createOpenAiCompletionClient } from "../vendors/llm/openai";
import { createOpenAiWebSearchGroundedClient } from "../vendors/llm/openai-responses";
import { createPerplexityGroundedClient } from "../vendors/llm/perplexity";
import {
  createXaiCompletionClient,
  createXaiGroundedClient,
} from "../vendors/llm/xai";
import { extractUrls } from "./domain/extract";
import { PROBE_MANIFEST } from "./domain/manifest";
import {
  citationFreshnessDays,
  scoreAbstention,
  scoreAnswerMatch,
  scoreCitationValidity,
  summarizeStat,
} from "./domain/score";
import type {
  RecencyProbe,
  TrendCallRecord,
  TrendModelCard,
  TrendModelRun,
  TrendRecencyResult,
} from "./domain/types";
import { TREND_MODELS } from "./models";

export type TrendRecencyRunOptions = Readonly<{
  fixture: boolean;
  trials: number;
  modelIds?: ReadonlyArray<string>;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

// Premises for the cost estimate: a short question plus a system instruction in,
// a concise cited answer out. These are catalog-priced approximations refined
// once a real trial measures true token counts and the grounded providers' true
// per-search billing.
const EST_INPUT_TOKENS_PER_CALL = 80;
const EST_OUTPUT_TOKENS_PER_CALL = 400;

const AGREED_CEILING_USD = 30;

const KEY_ENV: Record<TrendModelCard["provider"], string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

const completionClientFor = (
  card: TrendModelCard,
  key: string,
): CompletionClient => {
  if (card.provider === "anthropic") {
    return createAnthropicCompletionClient(card.apiModelId, key);
  }
  if (card.provider === "openai") {
    return createOpenAiCompletionClient(card.apiModelId, key);
  }
  if (card.provider === "google") {
    return createGoogleCompletionClient(card.apiModelId, key);
  }
  return createXaiCompletionClient(card.apiModelId, key);
};

// A GroundedAnswerClient over a plain text CompletionClient: used for the
// ungrounded controls, which answer from parametric memory. Any URL the model
// happens to emit in prose is surfaced as a bare citation so citation-validity is
// measured honestly (usually zero, which is the point of the control).
const groundedFromCompletion = (
  client: CompletionClient,
): GroundedAnswerClient => ({
  model: client.model,
  answer: async (question) => {
    const completion = await client.complete(question, { maxTokens: 1024 });
    return {
      answer: completion.text,
      citations: extractUrls(completion.text).map((url) => ({ url })),
      outputTokens: completion.outputTokens,
      elapsedMs: completion.elapsedMs,
      model: completion.model,
    };
  },
});

const groundedClientFor = (
  card: TrendModelCard,
  fixture: boolean,
): GroundedAnswerClient => {
  if (fixture) {
    return createFixtureGroundedAnswerClient(
      card.apiModelId,
      card.grounding === "grounded",
    );
  }
  const keyEnv = KEY_ENV[card.provider];
  const key = process.env[keyEnv];
  if (!key) {
    throw new Error(`${keyEnv} is required for a real ${card.provider} run.`);
  }
  if (card.provider === "perplexity") {
    return createPerplexityGroundedClient(card.apiModelId, key);
  }
  if (card.grounding === "ungrounded") {
    return groundedFromCompletion(completionClientFor(card, key));
  }
  // Grounded search-tool wiring for the chat providers. Each adapter enables
  // that provider's own search surface (xAI Agent Tools `web_search`, Gemini
  // `googleSearch` tool, OpenAI Responses `web_search` tool, Anthropic
  // `web_search` server tool) per its current documentation. The 2026-07-17 first
  // real trial verified the Gemini, OpenAI, and Anthropic wiring live (measured
  // rows) and RETIRED the xAI one: Live Search answered 410, so the xAI adapter
  // was migrated to Agent Tools and awaits its own owner-gated live probe.
  if (card.provider === "xai") {
    return createXaiGroundedClient(card.apiModelId, key);
  }
  if (card.provider === "google") {
    return createGoogleGroundedClient(card.apiModelId, key);
  }
  if (card.provider === "openai") {
    return createOpenAiWebSearchGroundedClient(card.apiModelId, key);
  }
  return createAnthropicGroundedClient(card.apiModelId, key);
};

const runProbeOnce = async (
  client: GroundedAnswerClient,
  probe: RecencyProbe,
  repetition: number,
): Promise<TrendCallRecord> => {
  const generated = await client.answer(probe.question);
  const freshness = citationFreshnessDays(
    generated.citations,
    probe.eventDateIso,
  );
  const base = {
    probeId: probe.id,
    repetition,
    latencyMs: generated.elapsedMs,
    outputTokens: generated.outputTokens,
    answer: generated.answer,
    citations: generated.citations,
    answerMatch: scoreAnswerMatch(generated.answer, probe),
    abstained: scoreAbstention(generated.answer),
    citationValidity: scoreCitationValidity(generated.citations),
    citationCount: generated.citations.length,
  };
  return freshness === undefined
    ? base
    : { ...base, citationFreshnessDays: freshness };
};

const aggregate = (
  card: TrendModelCard,
  provenance: TrendModelRun["provenance"],
  measuredAt: string,
  trials: number,
  calls: ReadonlyArray<TrendCallRecord>,
  error?: string,
): TrendModelRun => ({
  id: card.id,
  provider: card.provider,
  grounding: card.grounding,
  modelName: card.modelName,
  apiModelId: card.apiModelId,
  inputCostPerMTok: card.inputCostPerMTok,
  outputCostPerMTok: card.outputCostPerMTok,
  searchCostPerKRequestsUsd: card.searchCostPerKRequestsUsd,
  source: card.source,
  provenance,
  measuredAt,
  trialsRequested: trials,
  stats: {
    recencyAccuracy: summarizeStat(calls.map((call) => call.answerMatch)),
    abstentionRate: summarizeStat(calls.map((call) => call.abstained)),
    citationValidity: summarizeStat(calls.map((call) => call.citationValidity)),
    citationFreshnessDays: summarizeStat(
      calls
        .map((call) => call.citationFreshnessDays)
        .filter((value): value is number => value !== undefined),
    ),
    latencyMs: summarizeStat(calls.map((call) => call.latencyMs)),
  },
  calls,
  ...(error === undefined ? {} : { error }),
});

const selectedCards = (
  modelIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<TrendModelCard> =>
  modelIds === undefined || modelIds.length === 0
    ? TREND_MODELS
    : TREND_MODELS.filter((card) => modelIds.includes(card.id));

export const runTrendRecency = async (
  options: TrendRecencyRunOptions,
): Promise<TrendRecencyResult> => {
  const trials = Math.max(1, Math.trunc(options.trials));
  const generatedAt = options.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const runs: TrendModelRun[] = [];
  for (const card of selectedCards(options.modelIds)) {
    try {
      const client = groundedClientFor(card, options.fixture);
      const calls: TrendCallRecord[] = [];
      for (let repetition = 0; repetition < trials; repetition += 1) {
        for (const probe of PROBE_MANIFEST.probes) {
          calls.push(await runProbeOnce(client, probe, repetition));
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
    manifestVersion: PROBE_MANIFEST.version,
    windowDays: PROBE_MANIFEST.windowDays,
    runs,
    artifactPath: "trend-recency-comparison.data.json",
  };
};

export const estimateTrendRecency = (
  modelIds: ReadonlyArray<string> | undefined,
  trials: number,
): string => {
  const trialCount = Math.max(1, Math.trunc(trials));
  const probes = PROBE_MANIFEST.probes.length;
  const costOf = (card: TrendModelCard): number => {
    const calls = probes * trialCount;
    const tokenCost =
      (calls *
        (EST_INPUT_TOKENS_PER_CALL * card.inputCostPerMTok +
          EST_OUTPUT_TOKENS_PER_CALL * card.outputCostPerMTok)) /
      1_000_000;
    const searchCost = (calls * card.searchCostPerKRequestsUsd) / 1000;
    return tokenCost + searchCost;
  };
  const cards = selectedCards(modelIds);
  const lines = cards.map((card) => {
    const calls = probes * trialCount;
    return `  ${card.id} (${card.grounding}): ~$${costOf(card).toFixed(4)} for ${calls} probe answer(s)`;
  });
  const total = cards.reduce((sum, card) => sum + costOf(card), 0);
  return [
    "trend-recency estimate (real run; token counts and per-search billing are approximations):",
    ...lines,
    `  total: ~$${total.toFixed(4)} (agreed ceiling: $${AGREED_CEILING_USD}/trial — stop for re-approval above it)`,
    "Search surcharges dominate; ungrounded controls are token-only. No persistent provider resources are created.",
  ].join("\n");
};
