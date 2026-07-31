import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";
import type { CompletionClient, JsonSchema } from "../vendors/llm/types";
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

// How many of a report's citations are fetched and support-checked. Deep-research
// reports cite dozens of sources; a fixed sample bounds the judge's fetch + read
// cost while still detecting the fabricated-citation failure mode. Sampling is
// deterministic (first N) so a re-run over the same artifact is reproducible.
const CITATION_SAMPLE_SIZE = 6;
const CITATION_FETCH_TIMEOUT_MS = 8_000;
const REPORT_CHARS_FOR_JUDGE = 6_000;
const SNIPPET_CHARS = 1_200;

// Rubric grading is a structured-output call: the judge returns one satisfied
// yes/no per rubric id, constrained to the question's own ids so an off-list id
// cannot inflate the score (the pure scorer ignores unknown ids regardless).
const rubricSchema = (question: ResearchQuestion): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  required: ["answers"],
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rubricId", "satisfied"],
        properties: {
          rubricId: {
            type: "string",
            enum: question.rubric.map((item) => item.id),
          },
          satisfied: { type: "boolean" },
        },
      },
    },
  },
});

const rubricInstruction = (
  question: ResearchQuestion,
  report: string,
): string =>
  [
    "You are grading one research report against a fixed yes/no checklist.",
    "Answer every item strictly from what the report states. Return only JSON matching the schema.",
    "",
    "Checklist:",
    ...question.rubric.map((item) => `- ${item.id}: ${item.question}`),
    "",
    "Report:",
    report.slice(0, REPORT_CHARS_FOR_JUDGE),
  ].join("\n");

const parseRubricAnswers = (raw: string): ReadonlyArray<JudgeAnswer> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const answers = (parsed as { answers?: unknown }).answers;
    if (!Array.isArray(answers)) return [];
    return answers.flatMap((entry) => {
      const candidate = entry as { rubricId?: unknown; satisfied?: unknown };
      return typeof candidate.rubricId === "string" &&
        typeof candidate.satisfied === "boolean"
        ? [{ rubricId: candidate.rubricId, satisfied: candidate.satisfied }]
        : [];
    });
  } catch {
    return [];
  }
};

// One fetched citation: its resolvability and, when resolved, a text snippet the
// judge reads to decide whether the source supports the report. A fetch failure
// or non-2xx is an unresolved (invalid) citation — the fabricated-URL failure the
// validity metric exists to catch.
type FetchedCitation = Readonly<{
  url: string;
  resolved: boolean;
  snippet: string;
}>;

const stripHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fetchCitation = async (url: string): Promise<FetchedCitation> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CITATION_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) return { url, resolved: false, snippet: "" };
    const body = await response.text();
    return {
      url,
      resolved: true,
      snippet: stripHtml(body).slice(0, SNIPPET_CHARS),
    };
  } catch {
    return { url, resolved: false, snippet: "" };
  } finally {
    clearTimeout(timer);
  }
};

const supportSchema = (indices: ReadonlyArray<number>): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  required: ["checks"],
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "supports"],
        properties: {
          index: { type: "integer", enum: [...indices] },
          supports: { type: "boolean" },
        },
      },
    },
  },
});

const supportInstruction = (
  report: string,
  fetched: ReadonlyArray<FetchedCitation>,
): string =>
  [
    "You are checking whether cited sources support a research report.",
    "For each numbered source, decide if its content is topically relevant to and could support a claim in the report.",
    "Return only JSON matching the schema.",
    "",
    "Report (excerpt):",
    report.slice(0, REPORT_CHARS_FOR_JUDGE),
    "",
    "Sources:",
    ...fetched.map(
      (item, index) =>
        `[${index}] ${item.url}\n${item.snippet || "(no text extracted)"}`,
    ),
  ].join("\n");

const parseSupportChecks = (raw: string): ReadonlyMap<number, boolean> => {
  const byIndex = new Map<number, boolean>();
  try {
    const parsed: unknown = JSON.parse(raw);
    const checks = (parsed as { checks?: unknown }).checks;
    if (!Array.isArray(checks)) return byIndex;
    for (const entry of checks) {
      const candidate = entry as { index?: unknown; supports?: unknown };
      if (
        typeof candidate.index === "number" &&
        typeof candidate.supports === "boolean"
      ) {
        byIndex.set(candidate.index, candidate.supports);
      }
    }
  } catch {
    /* fall through to empty map */
  }
  return byIndex;
};

// The real judge: rubric grading and citation validity over a live LLM judge
// (structured output) plus real URL fetches. A citation is valid only when it
// BOTH resolves and the judge reads its content as supporting the report — the
// two halves of the fabricated-citation failure mode. Kept here (not in domain)
// because it does network + LLM IO; the pure scorers it feeds live in
// `domain/score.ts`. Mirrors the image-generation real judge's shape.
const createRealJudge = (judge: CompletionClient): Judge => ({
  model: judge.model,
  gradeRubric: async (question, report) => {
    const structured = await judge.completeStructured(
      rubricInstruction(question, report),
      rubricSchema(question),
      { maxTokens: 512 },
    );
    return parseRubricAnswers(structured.raw);
  },
  checkCitations: async (urls, report) => {
    const sample = urls.slice(0, CITATION_SAMPLE_SIZE);
    if (sample.length === 0) return [];
    const fetched = await Promise.all(sample.map(fetchCitation));
    const resolvedIndices = fetched
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.resolved)
      .map(({ index }) => index);
    // Unresolved citations are invalid without an LLM read; only resolved ones
    // are support-checked, in a single batched structured call.
    const support =
      resolvedIndices.length === 0
        ? new Map<number, boolean>()
        : parseSupportChecks(
            (
              await judge.completeStructured(
                supportInstruction(report, fetched),
                supportSchema(resolvedIndices),
                { maxTokens: 512 },
              )
            ).raw,
          );
    return fetched.map((item, index) => ({
      url: item.url,
      valid: item.resolved && (support.get(index) ?? false),
    }));
  },
});

const judgeFor = (fixture: boolean): Judge => {
  if (fixture) return createFixtureJudge();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is required for the real deep-research judge.",
    );
  }
  return createRealJudge(createAnthropicCompletionClient(JUDGE_MODEL_ID, key));
};

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
  return createRealDeepResearchClient(
    card.provider,
    card.apiModelId,
    key,
    card.approxCostPerQueryUsd,
  );
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
