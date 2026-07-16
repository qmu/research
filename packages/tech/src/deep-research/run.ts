import { createFixtureDeepResearchClient } from "../vendors/deep-research/fixture";
import { createRealDeepResearchClient } from "../vendors/deep-research/providers";
import type { DeepResearchClient } from "../vendors/deep-research/types";
import { QUESTION_MANIFEST } from "./domain/manifest";
import {
  citationMetrics,
  scoreAnswerQuality,
  scoreCitationValidity,
  summarizeStat,
} from "./domain/score";
import type {
  CitationCheck,
  DeepResearchCallRecord,
  DeepResearchResult,
  JudgeAnswer,
  ResearchQuestion,
  SubjectCard,
  SubjectRun,
} from "./domain/types";
import { DEEP_RESEARCH_SUBJECTS, JUDGE_MODEL_ID } from "./models";

export type DeepResearchRunOptions = Readonly<{
  fixture: boolean;
  trials: number;
  subjectIds?: ReadonlyArray<string>;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

// Estimate premises: one judge read per report (rubric grade) at ~3000 input +
// ~200 output tokens, plus the citation checks, at the judge model's catalog
// prices. An approximation — the binding figure is the provider bill.
const JUDGE_INPUT_TOKENS_PER_REPORT = 3_000;
const JUDGE_OUTPUT_TOKENS_PER_REPORT = 200;
const JUDGE_INPUT_USD_PER_MTOK = 3;
const JUDGE_OUTPUT_USD_PER_MTOK = 15;

/** The judge over one report: rubric answers + per-citation validity checks.
 * The keyless fixture judge echoes a perfect judgement so the real scoring path
 * runs end to end without keys. The REAL judge (fetch + LLM support-check) is a
 * follow-on ticket; the deferred stub throws a clear pointer if ever reached. */
type Judge = Readonly<{
  model: string;
  gradeRubric: (
    question: ResearchQuestion,
    report: string,
  ) => Promise<ReadonlyArray<JudgeAnswer>>;
  checkCitations: (
    urls: ReadonlyArray<string>,
    report: string,
  ) => Promise<ReadonlyArray<CitationCheck>>;
}>;

const createFixtureJudge = (): Judge => ({
  model: "fixture-judge",
  gradeRubric: (question, _report) =>
    Promise.resolve(
      question.rubric.map((item) => ({ rubricId: item.id, satisfied: true })),
    ),
  checkCitations: (urls, _report) =>
    Promise.resolve(urls.map((url) => ({ url, valid: true }))),
});

// Real subject clients and the real judge (fetch + LLM support-check) are gated
// on later mission tickets; this deferred judge throws a clear pointer if a real
// run ever reaches judging, rather than fabricating a verdict.
const createDeferredRealJudge = (): Judge => {
  const gated = (): never => {
    throw new Error(
      "real deep-research judge is not yet implemented — see mission ticket " +
        "#deep-research-metrics-and-graders.md (gated on proposal approval)",
    );
  };
  return {
    model: JUDGE_MODEL_ID,
    gradeRubric: () => Promise.resolve(gated()),
    checkCitations: () => Promise.resolve(gated()),
  };
};

const judgeFor = (fixture: boolean): Judge =>
  fixture ? createFixtureJudge() : createDeferredRealJudge();

const clientFor = (card: SubjectCard, fixture: boolean): DeepResearchClient => {
  if (fixture) return createFixtureDeepResearchClient(card.apiModelId);
  const keyEnv = {
    openai: "OPENAI_API_KEY",
    perplexity: "PERPLEXITY_API_KEY",
    google: "GOOGLE_API_KEY",
    xai: "XAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
  }[card.provider];
  const key = process.env[keyEnv];
  if (!key) {
    throw new Error(`${keyEnv} is required for a real ${card.provider} run.`);
  }
  return createRealDeepResearchClient(card.provider, card.apiModelId, key);
};

const runQuestionOnce = async (
  client: DeepResearchClient,
  judge: Judge,
  question: ResearchQuestion,
  repetition: number,
): Promise<DeepResearchCallRecord> => {
  const answer = await client.research(question.prompt);
  const metrics = citationMetrics(answer);
  const judgeAnswers = await judge.gradeRubric(question, answer.report);
  const citationChecks = await judge.checkCitations(
    answer.citations.map((citation) => citation.url),
    answer.report,
  );
  return {
    questionId: question.id,
    repetition,
    latencyMs: answer.elapsedMs,
    costUsd: answer.costUsd,
    reportCharLength: answer.report.length,
    citationCount: metrics.citationCount,
    citationDomains: metrics.citationDomains,
    sourceDiversity: metrics.sourceDiversity,
    ...(answer.searchCount === undefined
      ? {}
      : { searchCount: answer.searchCount }),
    judgeAnswers,
    answerQuality: scoreAnswerQuality(question, judgeAnswers),
    citationChecks,
    citationValidity: scoreCitationValidity(citationChecks),
  };
};

const numbersOf = (
  calls: ReadonlyArray<DeepResearchCallRecord>,
  pick: (call: DeepResearchCallRecord) => number | undefined,
): ReadonlyArray<number> =>
  calls.map(pick).filter((value): value is number => value !== undefined);

const aggregate = (
  card: SubjectCard,
  provenance: SubjectRun["provenance"],
  measuredAt: string,
  trials: number,
  calls: ReadonlyArray<DeepResearchCallRecord>,
  error?: string,
): SubjectRun => ({
  id: card.id,
  provider: card.provider,
  displayName: card.displayName,
  apiModelId: card.apiModelId,
  access: card.access,
  approxCostPerQueryUsd: card.approxCostPerQueryUsd,
  source: card.source,
  baseline: card.baseline ?? false,
  provenance,
  measuredAt,
  trialsRequested: trials,
  stats: {
    answerQuality: summarizeStat(
      numbersOf(calls, (call) => call.answerQuality),
    ),
    citationValidity: summarizeStat(
      numbersOf(calls, (call) => call.citationValidity),
    ),
    sourceDiversity: summarizeStat(calls.map((call) => call.sourceDiversity)),
    citationCount: summarizeStat(calls.map((call) => call.citationCount)),
    latencyMs: summarizeStat(calls.map((call) => call.latencyMs)),
    costUsd: summarizeStat(calls.map((call) => call.costUsd)),
  },
  calls,
  ...(error === undefined ? {} : { error }),
});

const selectedCards = (
  subjectIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<SubjectCard> =>
  subjectIds === undefined || subjectIds.length === 0
    ? DEEP_RESEARCH_SUBJECTS
    : DEEP_RESEARCH_SUBJECTS.filter((card) => subjectIds.includes(card.id));

export const runDeepResearch = async (
  options: DeepResearchRunOptions,
): Promise<DeepResearchResult> => {
  const trials = Math.max(1, Math.trunc(options.trials));
  const generatedAt = options.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const judge = judgeFor(options.fixture);
  const runs: SubjectRun[] = [];
  for (const card of selectedCards(options.subjectIds)) {
    try {
      const client = clientFor(card, options.fixture);
      const calls: DeepResearchCallRecord[] = [];
      for (let repetition = 0; repetition < trials; repetition += 1) {
        for (const question of QUESTION_MANIFEST.questions) {
          calls.push(
            await runQuestionOnce(client, judge, question, repetition),
          );
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
    judgeModel: options.fixture ? "fixture-judge" : JUDGE_MODEL_ID,
    manifestVersion: QUESTION_MANIFEST.version,
    runs,
    artifactPath: "deep-research-comparison.data.json",
  };
};

export const estimateDeepResearch = (
  subjectIds: ReadonlyArray<string> | undefined,
  trials: number,
): string => {
  const trialCount = Math.max(1, Math.trunc(trials));
  const questions = QUESTION_MANIFEST.questions.length;
  const judgePerReport =
    (JUDGE_INPUT_TOKENS_PER_REPORT * JUDGE_INPUT_USD_PER_MTOK +
      JUDGE_OUTPUT_TOKENS_PER_REPORT * JUDGE_OUTPUT_USD_PER_MTOK) /
    1_000_000;
  const cards = selectedCards(subjectIds);
  const lines = cards.map((card) => {
    const queries = questions * trialCount;
    const cost = queries * (card.approxCostPerQueryUsd + judgePerReport);
    return `  ${card.id}: ~$${cost.toFixed(2)} for ${queries} query(ies) (${questions} question(s) × ${trialCount} repetition(s)) + judge reads @ ~$${card.approxCostPerQueryUsd.toFixed(2)}/query`;
  });
  const total = cards.reduce(
    (sum, card) =>
      sum +
      questions * trialCount * (card.approxCostPerQueryUsd + judgePerReport),
    0,
  );
  return [
    "deep-research estimate (real run; per-query cost is a curated reference midpoint, not a live quote):",
    ...lines,
    `  total: ~$${total.toFixed(2)} across ${cards.length} subject(s) (proposal Floor design ≈ $25–60; an estimate above the agreed ceiling stops for re-approval)`,
    "No persistent provider resources are created; reports are judged in memory and discarded.",
  ].join("\n");
};
