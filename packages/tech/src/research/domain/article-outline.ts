export type ArticleLanguage = "english" | "japanese";

export type ArticleOutline = Readonly<{
  h2: ReadonlyArray<string>;
  h3: ReadonlyArray<string>;
}>;

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

export const articleOutlineProblems = (
  markdown: string,
  language: ArticleLanguage,
): ReadonlyArray<string> => {
  const expected = ARTICLE_OUTLINE[language];
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
