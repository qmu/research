import type { PromptManifest } from "./types";

/**
 * The versioned prompt manifest. Every constraint is a mechanically checkable
 * yes/no question (object counts, colors, spatial relations, exact text) so the
 * vision judge answers a deterministic rubric — no aesthetic opinion enters the
 * score. Changing prompts or constraints is a manifest-version bump; history
 * charts connect same-version points only.
 */
export const PROMPT_MANIFEST: PromptManifest = {
  version: "1",
  prompts: [
    {
      id: "three-red-circles",
      kind: "adherence",
      prompt:
        "Draw exactly three red circles on a plain white background. Nothing else.",
      constraints: [
        {
          id: "circle-count",
          question: "Does the image contain exactly three circles?",
        },
        { id: "circles-red", question: "Are all circles red?" },
        {
          id: "white-background",
          question: "Is the background plain white with no other objects?",
        },
      ],
    },
    {
      id: "square-left-of-triangle",
      kind: "adherence",
      prompt:
        "Draw one blue square to the left of one yellow triangle on a plain white background. Nothing else.",
      constraints: [
        {
          id: "has-blue-square",
          question: "Is there exactly one blue square?",
        },
        {
          id: "has-yellow-triangle",
          question: "Is there exactly one yellow triangle?",
        },
        {
          id: "square-left",
          question: "Is the square positioned to the left of the triangle?",
        },
        {
          id: "white-background",
          question: "Is the background plain white with no other objects?",
        },
      ],
    },
    {
      id: "five-green-stars-row",
      kind: "adherence",
      prompt:
        "Draw exactly five green five-pointed stars arranged in one horizontal row on a plain white background.",
      constraints: [
        {
          id: "star-count",
          question: "Does the image contain exactly five stars?",
        },
        { id: "stars-green", question: "Are all stars green?" },
        {
          id: "single-row",
          question: "Are the stars arranged in a single horizontal row?",
        },
      ],
    },
    {
      id: "black-cat-facing-left",
      kind: "adherence",
      prompt:
        "Draw a solid black silhouette of one cat facing left, on a plain white background.",
      constraints: [
        { id: "is-cat", question: "Does the image depict exactly one cat?" },
        {
          id: "solid-black",
          question: "Is the cat a solid black silhouette?",
        },
        { id: "facing-left", question: "Is the cat facing left?" },
      ],
    },
    {
      id: "two-orange-one-purple-diamond",
      kind: "adherence",
      prompt:
        "Draw exactly two orange diamonds and exactly one purple diamond on a plain white background.",
      constraints: [
        {
          id: "orange-count",
          question: "Does the image contain exactly two orange diamonds?",
        },
        {
          id: "purple-count",
          question: "Does the image contain exactly one purple diamond?",
        },
        {
          id: "only-diamonds",
          question: "Are diamonds the only shapes in the image?",
        },
      ],
    },
    {
      id: "red-circle-above-blue-line",
      kind: "adherence",
      prompt:
        "Draw one red circle directly above one horizontal blue line on a plain white background.",
      constraints: [
        { id: "has-red-circle", question: "Is there exactly one red circle?" },
        {
          id: "has-blue-line",
          question: "Is there exactly one horizontal blue line?",
        },
        {
          id: "circle-above",
          question: "Is the circle positioned above the line?",
        },
      ],
    },
    {
      id: "text-hello-benchmark",
      kind: "text",
      prompt:
        'Render the exact text "HELLO BENCHMARK" in large black capital letters on a plain white background. No other elements.',
      constraints: [],
      expectedText: "HELLO BENCHMARK",
    },
    {
      id: "text-qmu-research-2026",
      kind: "text",
      prompt:
        'Render the exact text "QMU RESEARCH 2026" in large black capital letters on a plain white background. No other elements.',
      constraints: [],
      expectedText: "QMU RESEARCH 2026",
    },
  ],
};
