import type { Citation } from "./types";

/**
 * Where a cited source's published date comes from.
 *
 * The first real trial (2026-07-17) returned ZERO dated citations on every
 * measured row, so `citationFreshnessDays` was n/a everywhere and the freshness
 * metric had no signal at all: Gemini's `groundingChunks` and OpenAI's
 * `url_citation` annotations carry no date, and Anthropic's `page_age` was absent
 * that run. Two date sources exist that keep scoring pure and keyless:
 *
 * 1. **The provider's own date field**, normalized by each vendor ACL into
 *    `Citation.publishedDateIso` (Anthropic `page_age`, Perplexity
 *    `search_results[].date`, xAI dated citation entries).
 * 2. **A date the publisher embedded in the article URL** (`/2026/07/15/…`,
 *    `/2026/7/15/…`, `/2026-07-15-…`) — the shape used by AP, NPR, Al Jazeera,
 *    TechCrunch and most news CMSs. It is mechanical, offline, and a reader can
 *    re-derive it from the citation URL committed in the run record.
 *
 * Resolving cited URLs over the network to read published metadata — which would
 * also upgrade citationValidity from well-formed-URL to resolves-and-supports —
 * is deliberately NOT done here: it would make scoring depend on the live web, so
 * re-scoring a committed frame would stop being reproducible and the keyless path
 * would stop being offline. That is a later instrument version, with the run
 * recording resolution results as data rather than the scorer fetching them.
 */

// A calendar date embedded in a URL path: 2026/07/15, 2026/7/15, or 2026-07-15.
// Anchored on a 4-digit 20xx year with no adjacent digits, so an opaque numeric
// article id cannot masquerade as a date.
const URL_PATH_DATE = /(?<!\d)(20\d{2})[/-](\d{1,2})[/-](\d{1,2})(?!\d)/;

const pad = (value: number): string => String(value).padStart(2, "0");

/** A real calendar date, as ISO `YYYY-MM-DD` — or undefined when the numbers do
 * not name one (2026-02-31 is three numbers, not a date). */
const toCalendarDateIso = (
  year: number,
  month: number,
  day: number,
): string | undefined => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
};

/** The publication date a URL embeds in its PATH, or undefined. The path only:
 * a host name or a tracking query (`?utm_source=…`) never dates an article. Pure
 * and total — a malformed URL yields undefined, never a throw. */
export const publishedDateFromUrl = (url: string): string | undefined => {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return undefined;
  }
  const match = URL_PATH_DATE.exec(pathname);
  if (match === null) return undefined;
  return toCalendarDateIso(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
};

/** The date to score a citation's freshness against: the provider's own date
 * when it parses, else a date embedded in the cited URL, else undefined (the
 * citation contributes nothing to freshness rather than faking a zero age).
 * The provider's string is passed through unchanged, never reformatted — it is
 * already ISO by ACL contract, and re-parsing a date-only string through local
 * time can shift it a day. */
export const citationPublishedDateIso = (
  citation: Citation,
): string | undefined => {
  if (
    citation.publishedDateIso !== undefined &&
    !Number.isNaN(Date.parse(citation.publishedDateIso))
  ) {
    return citation.publishedDateIso;
  }
  return publishedDateFromUrl(citation.url);
};
