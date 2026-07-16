import type { Citation, RecencyProbe, Stat } from "./types";

/**
 * Pure, mechanical scoring for the trend-recency benchmark. Every score is
 * computed from the answer text and its citations — no LLM judge. The semantic
 * recency grade and the hallucination-rate metric need a judge over the answer
 * and ground truth and arrive with a later ticket (mirroring how the SVG topic
 * defers its vision-judge fidelity metric); these four scores are what the
 * keyless path can measure honestly today.
 */

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Recency answer match (mechanical proxy): 1 when every expected keyword is
 * present (normalized substring) in the answer, else 0. A strict, deterministic
 * stand-in for the semantic judge — it never credits an answer that omits a
 * required fact, and never scores a probe with no keywords. */
export const scoreAnswerMatch = (
  answer: string,
  probe: RecencyProbe,
): number => {
  if (probe.expectedKeywords.length === 0) return 0;
  const haystack = normalize(answer);
  return probe.expectedKeywords.every((keyword) =>
    haystack.includes(normalize(keyword)),
  )
    ? 1
    : 0;
};

const ABSTENTION_MARKERS = [
  "i don't have",
  "i do not have",
  "i cannot",
  "i can't",
  "no information",
  "not able to",
  "as of my",
  "training data",
  "training cutoff",
  "knowledge cutoff",
  "unable to",
  "i'm not sure",
  "i am not sure",
  "don't know",
  "do not know",
];

/** 1 when the answer honestly declines to assert a recent fact. An abstention is
 * NOT a hallucination — the later hallucination judge must credit honest
 * abstention — so this mechanical flag lets the keyless path separate "declined"
 * from "answered". */
export const scoreAbstention = (answer: string): number => {
  const haystack = answer.toLowerCase();
  return ABSTENTION_MARKERS.some((marker) => haystack.includes(marker)) ? 1 : 0;
};

const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".")
    );
  } catch {
    return false;
  }
};

/** Citation validity (keyless proxy): the fraction of returned citations whose
 * URL is a well-formed http(s) URL. Live resolution and claim-support checking is
 * a later ticket; a malformed or fabricated-looking URL already scores 0 here. No
 * citations → 0, since an ungrounded answer offers no verifiable source. */
export const scoreCitationValidity = (
  citations: ReadonlyArray<Citation>,
): number => {
  if (citations.length === 0) return 0;
  const valid = citations.filter((citation) =>
    isValidHttpUrl(citation.url),
  ).length;
  return valid / citations.length;
};

/** Median published-age of the dated citations, in days relative to the event
 * (`Math.abs`, so both stale and implausibly-future dates read as distance from
 * the event). Lower is fresher. Returns undefined when no citation carries a
 * parseable date. */
export const citationFreshnessDays = (
  citations: ReadonlyArray<Citation>,
  eventDateIso: string,
): number | undefined => {
  const event = Date.parse(eventDateIso);
  if (Number.isNaN(event)) return undefined;
  const ages = citations
    .map((citation) =>
      citation.publishedDateIso === undefined
        ? Number.NaN
        : Date.parse(citation.publishedDateIso),
    )
    .filter((time) => !Number.isNaN(time))
    .map((time) => Math.abs(time - event) / 86_400_000);
  if (ages.length === 0) return undefined;
  const sorted = [...ages].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/** Mean, sample standard deviation, and count. n=0 yields all-zero; n=1 yields
 * stdDev 0 — the same aggregation convention as the other topics. */
export const summarizeStat = (values: ReadonlyArray<number>): Stat => {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, n: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n === 1) return { mean, stdDev: 0, n };
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance), n };
};
