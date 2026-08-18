/**
 * The fixed Japanese rendering of terms that must not be re-invented mid-page.
 *
 * The published reports are long — the accuracy page is 661 lines — so the
 * translator processes them in roughly fifteen calls, and **each call sees only
 * its own slice**. A term first rendered in call 3 is therefore re-derived from
 * scratch in call 14, and the two renderings need not agree. The drift lands
 * preferentially at the *end* of a document, where the chunk count is highest
 * and a reviewer's attention is lowest.
 *
 * Measured on the pages regenerated at `1fefebc`:
 *
 * | Page | Term | Renderings |
 * | ---- | ---- | ---------- |
 * | `llm-accuracy-comparison` | verdict row label | `総合判定` ×10, `総合評価` ×1 |
 * | `llm-accuracy-comparison` | the `mixed` verdict | `mixed` ×9, `まちまち` ×1 |
 * | `llm-speed-comparison` | the `indistinguishable` verdict | `判別不能` ×2, `区別不能` ×3 |
 *
 * The numbers in those pages are correct — every verdict line was checked
 * against its English source. This is a labelling defect, and it costs a reader
 * the work of realising that `総合評価`/`まちまち` name the same row and value as
 * `総合判定`/`mixed` two blocks above.
 *
 * Two uses, one source:
 *
 * 1. **Prevention** — `glossaryPromptLines` goes into *every* chunk's prompt, so
 *    a term cannot be re-invented per call. This addresses the mechanism.
 * 2. **Detection** — `findGlossaryDrift` reads a produced page and reports any
 *    forbidden alternative, with **no API calls**, so a regression is caught by
 *    a check rather than by paying for another translation pass to discover it.
 *
 * **Only true synonyms belong in `alternatives`.** A bilingual gloss on first
 * definition (`**mixed（混在）**` where the paragraph is *defining* the term) is
 * legitimate writing, not drift, and forbidding it would make the checker fight
 * the prose. What is forbidden is a second, different word for the same thing.
 */

export type GlossaryEntry = Readonly<{
  /** Stable identifier for the concept, used in checker output. */
  id: string;
  /** What the term is, in English, for the prompt line. */
  concept: string;
  /** The single rendering every chunk must use. */
  japanese: string;
  /** Renderings that must not appear — true synonyms, observed in the wild. */
  alternatives: ReadonlyArray<string>;
}>;

export const TRANSLATION_GLOSSARY: ReadonlyArray<GlossaryEntry> = [
  {
    id: "overall-verdict-label",
    concept: "the label of the overall generational verdict line",
    japanese: "総合判定",
    alternatives: ["総合評価"],
  },
  {
    id: "verdict-mixed",
    concept: "the `mixed` verdict value",
    japanese: "mixed",
    alternatives: ["まちまち"],
  },
  {
    id: "verdict-indistinguishable",
    concept: "the `indistinguishable` verdict value",
    japanese: "判別不能",
    alternatives: ["区別不能"],
  },
];

/**
 * The glossary as prompt lines, for inclusion in every chunk.
 *
 * Stated as "use X, never Y" rather than as a bare word list: the failure being
 * prevented is a plausible *alternative*, so naming the alternative is what makes
 * the instruction bite.
 */
export const glossaryPromptLines = (
  glossary: ReadonlyArray<GlossaryEntry> = TRANSLATION_GLOSSARY,
): ReadonlyArray<string> =>
  glossary.map(
    (entry) =>
      `  - ${entry.concept}: always "${entry.japanese}"` +
      (entry.alternatives.length === 0
        ? ""
        : `, never ${entry.alternatives.map((alt) => `"${alt}"`).join(" or ")}`),
  );

export type GlossaryDrift = Readonly<{
  id: string;
  japanese: string;
  /** The forbidden rendering that was found. */
  found: string;
  /** How many times it appears. */
  occurrences: number;
  /** How many times the canonical rendering appears in the same document. */
  canonicalOccurrences: number;
}>;

const countOccurrences = (haystack: string, needle: string): number => {
  if (needle === "") return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
};

/**
 * Every forbidden rendering present in a produced Japanese page.
 *
 * Returns the canonical count alongside each finding, because that is what makes
 * the report actionable: `総合評価 ×1` beside `総合判定 ×10` says "one straggler
 * at the end of a long page", which is the shape this defect actually takes.
 *
 * Pure and API-free by design — the whole point is that this is cheap enough to
 * run on every page, every time, rather than costing a ~$7 translation pass to
 * discover after the fact.
 */
export const findGlossaryDrift = (
  markdown: string,
  glossary: ReadonlyArray<GlossaryEntry> = TRANSLATION_GLOSSARY,
): ReadonlyArray<GlossaryDrift> => {
  const drift: GlossaryDrift[] = [];
  for (const entry of glossary) {
    const canonicalOccurrences = countOccurrences(markdown, entry.japanese);
    for (const alternative of entry.alternatives) {
      const occurrences = countOccurrences(markdown, alternative);
      if (occurrences === 0) continue;
      drift.push({
        id: entry.id,
        japanese: entry.japanese,
        found: alternative,
        occurrences,
        canonicalOccurrences,
      });
    }
  }
  return drift;
};

/** One human-readable line per finding, for a CLI check. */
export const describeGlossaryDrift = (drift: GlossaryDrift): string =>
  `${drift.id}: found "${drift.found}" x${drift.occurrences} ` +
  `where the glossary fixes "${drift.japanese}" ` +
  `(x${drift.canonicalOccurrences} in the same page)`;
