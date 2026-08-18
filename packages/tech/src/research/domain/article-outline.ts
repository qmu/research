export type ArticleLanguage = "english" | "japanese";

export type ArticleOutline = Readonly<{
  h2: ReadonlyArray<string>;
  h3: ReadonlyArray<string>;
}>;

/**
 * Which outline a topic's published pages follow.
 *
 * `standard` is the seven-section verification article every MEASURED topic
 * shares (commit cea205c, "Standardize public research article outlines"): a
 * topic that reports a measurement reads as the same article in both
 * languages. `catalog` is the documented exception for a REFERENCE topic
 * (`TopicSpec.kind === "catalog"`), which measures nothing and so has no
 * research purpose, no measurement targets, and no reproduction cost to state.
 *
 * Both are validated repo-wide and both carry an EN→JP heading pair map, so
 * the exception buys a different structure without giving up either property.
 * Adding a third outline is a deliberate act, not a per-topic escape hatch.
 */
export type ArticleOutlineKind = "standard" | "catalog";

export const ARTICLE_OUTLINE = {
  english: {
    h2: [
      "1. Research Purpose",
      "2. Measurement Targets",
      "3. Scope and Constraints",
      "4. Verification Results",
      "5. Analysis",
      "6. Reproduction",
      "7. Verification Data",
    ],
    h3: [
      "Target Models",
      "Target Metrics",
      "Reproduction Steps",
      "Reproduction Cost (Estimate)",
      "Cleanup",
    ],
  },
  japanese: {
    h2: [
      "1. 調査の目的",
      "2. 測定対象",
      "3. 範囲と制約",
      "4. 検証結果",
      "5. 考察",
      "6. 再現方法",
      "7. 検証データ",
    ],
    h3: [
      "対象モデル",
      "対象メトリクス",
      "再現手順",
      "再現コスト（目安）",
      "クリーンアップ",
    ],
  },
} satisfies Readonly<Record<ArticleLanguage, ArticleOutline>>;

/**
 * The reference-catalog outline. Deliberately unlike the verification outline:
 * unnumbered, four sections, and opening on a rough summary of what is covered
 * rather than on a research purpose. It restores the compact `Catalog` /
 * `Sources` shape the topic's archived frames under
 * `docs/research-reports/history/foundation-models/` were written in.
 */
export const CATALOG_OUTLINE = {
  english: {
    h2: ["Overview", "Coverage", "Catalog", "Sources"],
    h3: [],
  },
  japanese: {
    h2: ["概要", "収録範囲", "カタログ", "出典"],
    h3: [],
  },
} satisfies Readonly<Record<ArticleLanguage, ArticleOutline>>;

export const ARTICLE_OUTLINES = {
  standard: ARTICLE_OUTLINE,
  catalog: CATALOG_OUTLINE,
} satisfies Readonly<
  Record<ArticleOutlineKind, Readonly<Record<ArticleLanguage, ArticleOutline>>>
>;

/**
 * The outline a topic's pages follow, from its `TopicSpec.kind`. Keyed on the
 * marker the registry already carries so outline selection stays per-topic and
 * declarative — no second list of topic ids to drift against the first.
 * Anything that is not a catalog (including an unregistered topic) keeps the
 * standard outline, so a new topic is on the validated default by omission.
 */
export const outlineKindForTopicKind = (
  topicKind: string | undefined,
): ArticleOutlineKind => (topicKind === "catalog" ? "catalog" : "standard");

export type StandardArticleParts = Readonly<{
  title: string;
  description: string;
  introduction?: string;
  purpose: string;
  targetModels: string;
  targetMetrics: string;
  scopeAndConstraints: string;
  verificationResults: string;
  analysis: string;
  reproductionSteps: string;
  reproductionCost: string;
  cleanup: string;
  verificationData: string;
}>;

const trimBlock = (value: string): string => value.trim();

export const renderEnglishResearchArticle = (
  parts: StandardArticleParts,
): string => {
  const intro =
    parts.introduction === undefined
      ? ""
      : `\n${trimBlock(parts.introduction)}\n`;
  return `---
title: ${parts.title}
description: ${parts.description}
---

# ${parts.title}
${intro}
## 1. Research Purpose

${trimBlock(parts.purpose)}

## 2. Measurement Targets

### Target Models

${trimBlock(parts.targetModels)}

### Target Metrics

${trimBlock(parts.targetMetrics)}

## 3. Scope and Constraints

${trimBlock(parts.scopeAndConstraints)}

## 4. Verification Results

${trimBlock(parts.verificationResults)}

## 5. Analysis

${trimBlock(parts.analysis)}

## 6. Reproduction

### Reproduction Steps

${trimBlock(parts.reproductionSteps)}

### Reproduction Cost (Estimate)

${trimBlock(parts.reproductionCost)}

### Cleanup

${trimBlock(parts.cleanup)}

## 7. Verification Data

${trimBlock(parts.verificationData)}
`;
};

export type CatalogArticleParts = Readonly<{
  title: string;
  description: string;
  /** The opening summary: what is covered, and how it is (and is not) evaluated. */
  overview: string;
  coverage: string;
  catalog: string;
  sources: string;
}>;

/**
 * Render a reference-catalog article on `CATALOG_OUTLINE`. The Overview opens
 * the page directly — a catalog has no purpose chapter to precede it, so there
 * is no separate pre-heading introduction.
 */
export const renderEnglishCatalogArticle = (
  parts: CatalogArticleParts,
): string => `---
title: ${parts.title}
description: ${parts.description}
---

# ${parts.title}

## Overview

${trimBlock(parts.overview)}

## Coverage

${trimBlock(parts.coverage)}

## Catalog

${trimBlock(parts.catalog)}

## Sources

${trimBlock(parts.sources)}
`;

export type MarkdownHeading = Readonly<{
  level: number;
  text: string;
}>;

export const extractMarkdownHeadings = (
  markdown: string,
): ReadonlyArray<MarkdownHeading> => {
  const headings: MarkdownHeading[] = [];
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match === null) continue;
    const [, marker = "", text = ""] = match;
    headings.push({ level: marker.length, text });
  }
  return headings;
};

/**
 * The outline problems in a published page, checked against the outline its
 * topic follows. `kind` defaults to `standard` so every verification topic's
 * call site reads unchanged and a caller that forgets the argument is checked
 * against the strict outline rather than silently unvalidated.
 */
export const articleOutlineProblems = (
  markdown: string,
  language: ArticleLanguage,
  kind: ArticleOutlineKind = "standard",
): ReadonlyArray<string> => {
  const expected = ARTICLE_OUTLINES[kind][language];
  const headings = extractMarkdownHeadings(markdown);
  const h2 = headings
    .filter((heading) => heading.level === 2)
    .map((heading) => heading.text);
  const problems: string[] = [];
  if (JSON.stringify(h2) !== JSON.stringify(expected.h2)) {
    problems.push(`H2 mismatch: ${JSON.stringify(h2)}`);
  }

  const h3 = headings
    .filter((heading) => heading.level === 3)
    .map((heading) => heading.text);
  if (JSON.stringify(h3) !== JSON.stringify(expected.h3)) {
    problems.push(`H3 mismatch: ${JSON.stringify(h3)}`);
  }
  if (markdown.includes("Not Committed Yet")) {
    problems.push("contains Not Committed Yet");
  }
  return problems;
};
