import { citationPublishedDateIso } from "./citation-date";
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

// Real answers do not type ASCII apostrophes: the first trial's GPT-5.5 control
// wrote "I don’t have reliable information …" with U+2019, and an ASCII-only
// marker list scored that honest decline 0. Fold every apostrophe form to ASCII
// and expand the negative contractions, so the marker set below is written ONCE
// in canonical, non-contracted English instead of once per typographic variant.
const APOSTROPHES = /[‘’‛ʼʹ´`]/g;

const CONTRACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\b(\w+)n't\b/g, "$1 not"],
  [/\bi'm\b/g, "i am"],
  [/\bi'll\b/g, "i will"],
  [/\bi've\b/g, "i have"],
  [/\bi'd\b/g, "i would"],
];

/** Lowercase, ASCII-fold the apostrophes, expand negative contractions, and
 * collapse whitespace — the normalized form every abstention marker is matched
 * against. Exported for its own unit test: the trial's misses were normalization
 * misses, not marker-set misses. */
export const normalizeAnswerText = (answer: string): string =>
  CONTRACTIONS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    answer.toLowerCase().normalize("NFKC").replace(APOSTROPHES, "'"),
  ).replace(/\s+/g, " ");

// Canonical (apostrophe-folded, contraction-expanded) substrings that mark a
// decline to assert.
const ABSTENTION_MARKERS = [
  "i do not have",
  "i cannot",
  "no information",
  "no reliable information",
  "not able to",
  "as of my",
  "training data",
  "training cutoff",
  "knowledge cutoff",
  "unable to",
  "i am not sure",
  "do not know",
  "no such",
];

// Phrasal declines the substring list cannot express. The first trial's Grok and
// Gemini controls declined by dating the event rather than by naming their own
// limits — "The 2026 Wimbledon Championships have not yet occurred.", "The 2026
// FIFA World Cup has not occurred yet.", "GPT-5.6 does not exist." — and scored
// 0 as honest abstentions the controls deserved credit for.
const ABSTENTION_PATTERNS: ReadonlyArray<RegExp> = [
  /\bnot\s+(?:yet\s+)?(?:occurred|happened|taken place|been played|been held|been announced|been released)\b/g,
  /\b(?:does|do|did)\s+not\s+exist\b/g,
];

// An announced lookup: "I don't know … let me search" and then an answer.
const SEARCH_ANNOUNCEMENT_PATTERNS: ReadonlyArray<RegExp> = [
  /\blet me (?:search|check|look|find|verify|see)\b/g,
  /\bi will (?:search|check|look|verify)\b/g,
];

// How much answer must follow an announced lookup before it counts as one. A
// promise to search with nothing after it is still a decline; the trial's
// false-positive rows carried hundreds of characters of cited answer after theirs.
const DELIVERED_ANSWER_MIN_CHARS = 40;

const lastAbstentionIndex = (text: string): number => {
  let last = -1;
  for (const marker of ABSTENTION_MARKERS) {
    last = Math.max(last, text.lastIndexOf(marker));
  }
  for (const pattern of ABSTENTION_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match.index !== undefined) last = Math.max(last, match.index);
    }
  }
  return last;
};

// True when the answer announces a lookup AFTER its last abstention marker and
// then delivers a substantive answer — i.e. the abstention was retracted.
const isRetractedAfter = (text: string, from: number): boolean => {
  for (const pattern of SEARCH_ANNOUNCEMENT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined || match.index < from) continue;
      const delivered = text.slice(match.index + match[0].length).trim();
      if (delivered.length >= DELIVERED_ANSWER_MIN_CHARS) return true;
    }
  }
  return false;
};

/** 1 when the answer honestly declines to assert a recent fact. An abstention is
 * NOT a hallucination — the later hallucination judge must credit honest
 * abstention — so this mechanical flag lets the keyless path separate "declined"
 * from "answered".
 *
 * The flag reads the answer's FINAL stance, not merely whether a decline appears
 * somewhere in it. A grounded model that opens "I don't have any information
 * about a 'GPT-5.6' family. Let me search to check whether this exists." and then
 * answers correctly from what it retrieved has not declined — the first trial
 * scored exactly that row abstained=1, a false positive on a model that answered.
 * So a decline followed by an announced lookup AND a delivered answer scores 0,
 * while a lookup that ends in another decline (the last marker then sits after
 * the announcement) stays 1. */
export const scoreAbstention = (answer: string): number => {
  const text = normalizeAnswerText(answer);
  const abstention = lastAbstentionIndex(text);
  if (abstention < 0) return 0;
  return isRetractedAfter(text, abstention) ? 0 : 1;
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
 * date — the metric stays n/a rather than faking a zero age.
 *
 * A citation is "dated" when the provider returned a date OR the cited URL
 * embeds one (see `citation-date.ts`): the first trial proved that most grounded
 * surfaces return none, which left this metric with no signal on every row. */
export const citationFreshnessDays = (
  citations: ReadonlyArray<Citation>,
  eventDateIso: string,
): number | undefined => {
  const event = Date.parse(eventDateIso);
  if (Number.isNaN(event)) return undefined;
  const ages = citations
    .map((citation) => {
      const published = citationPublishedDateIso(citation);
      return published === undefined ? Number.NaN : Date.parse(published);
    })
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
