import type {
  Citation,
  DeepResearchAnswer,
} from "../../vendors/deep-research/types";
import type {
  CitationCheck,
  JudgeAnswer,
  ResearchQuestion,
  Stat,
} from "./types";

/**
 * Pure scoring for the deep-research benchmark. Every score is computed
 * mechanically from the judge's rubric answers, citation checks, or the returned
 * citations; no aesthetic judgement enters here, so the graders stay
 * unit-testable and identical across subjects.
 */

/** The registrable domain of a URL: the host with a leading `www.` stripped, or
 * `""` when the URL cannot be parsed. Deliberately a simple heuristic (last
 * labels are NOT collapsed against a public-suffix list) — good enough to count
 * source diversity, and honest about its limits. */
export const registrableDomain = (url: string): string => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
};

/** The distinct, parseable registrable domains among a citation list, in first-
 * seen order. Unparseable URLs are dropped, so a citation with a broken URL
 * neither inflates nor is counted toward diversity. */
export const citationDomains = (
  citations: ReadonlyArray<Citation>,
): ReadonlyArray<string> => {
  const seen: string[] = [];
  for (const citation of citations) {
    const domain = registrableDomain(citation.url);
    if (domain !== "" && !seen.includes(domain)) seen.push(domain);
  }
  return seen;
};

/** Distinct-source count: how many different domains the report drew on. */
export const sourceDiversity = (citations: ReadonlyArray<Citation>): number =>
  citationDomains(citations).length;

/** Satisfied rubric items over total. Answers for unknown rubric ids are
 * ignored; a rubric item the judge did not answer counts as unsatisfied, so a
 * partial judge response can only lower the score, never inflate it — the same
 * convention as the image-generation adherence score. */
export const scoreAnswerQuality = (
  question: ResearchQuestion,
  answers: ReadonlyArray<JudgeAnswer>,
): number => {
  if (question.rubric.length === 0) return 0;
  const satisfied = question.rubric.filter((item) =>
    answers.some((answer) => answer.rubricId === item.id && answer.satisfied),
  ).length;
  return satisfied / question.rubric.length;
};

/** Valid citations over checked citations. No checks yields 0 (nothing verified,
 * so no credit), never a divide-by-zero. */
export const scoreCitationValidity = (
  checks: ReadonlyArray<CitationCheck>,
): number => {
  if (checks.length === 0) return 0;
  const valid = checks.filter((check) => check.valid).length;
  return valid / checks.length;
};

/** Mean, sample standard deviation, and count. n=0 yields all-zero; n=1 yields
 * stdDev 0 — mirroring the other topics' aggregation conventions. */
export const summarizeStat = (values: ReadonlyArray<number>): Stat => {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, n: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n === 1) return { mean, stdDev: 0, n };
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance), n };
};

/** Convenience: the citation-derived fields of one call, computed from a raw
 * provider answer. Keeps the runner thin and the derivation tested here. */
export const citationMetrics = (
  answer: DeepResearchAnswer,
): Readonly<{
  citationCount: number;
  citationDomains: ReadonlyArray<string>;
  sourceDiversity: number;
}> => {
  const domains = citationDomains(answer.citations);
  return {
    citationCount: answer.citations.length,
    citationDomains: domains,
    sourceDiversity: domains.length,
  };
};
