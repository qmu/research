import type { PromptManifest } from "./types";

/**
 * The versioned prompt manifest. Every constraint is a mechanically checkable
 * yes/no question (object counts, colors, spatial relations, exact text) so the
 * vision judge answers a deterministic rubric — no aesthetic opinion enters the
 * score. Changing prompts or constraints is a manifest-version bump; history
 * charts connect same-version points only.
 *
 * Version 2 adds five `practical` categories (presentation slide, photo,
 * character illustration, infographic, dense meeting document) on top of the
 * original `mechanical` shape/text probes. The practical prompts keep the same
 * yes/no rubric discipline — every constraint below is answerable purely from
 * what is visible — so the scores stay mechanical while the generated images
 * become the qualitative exhibit shown inline on the published pages.
 */
export const PROMPT_MANIFEST: PromptManifest = {
  version: "2",
  prompts: [
    {
      id: "three-red-circles",
      kind: "adherence",
      category: "mechanical",
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
      category: "mechanical",
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
      category: "mechanical",
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
      category: "mechanical",
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
      category: "mechanical",
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
      category: "mechanical",
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
      category: "mechanical",
      prompt:
        'Render the exact text "HELLO BENCHMARK" in large black capital letters on a plain white background. No other elements.',
      constraints: [],
      expectedText: "HELLO BENCHMARK",
    },
    {
      id: "text-qmu-research-2026",
      kind: "text",
      category: "mechanical",
      prompt:
        'Render the exact text "QMU RESEARCH 2026" in large black capital letters on a plain white background. No other elements.',
      constraints: [],
      expectedText: "QMU RESEARCH 2026",
    },
    {
      id: "slide-quarterly-review",
      kind: "adherence",
      category: "presentation-slide",
      prompt:
        'Design one presentation slide on a plain light background. Put a single title bar across the top reading "QUARTERLY REVIEW", and below it exactly three bullet points of short text. No photos, charts, or other graphics.',
      constraints: [
        {
          id: "has-title-bar",
          question: "Is there a single title bar across the top of the slide?",
        },
        {
          id: "title-reads-quarterly-review",
          question: 'Does the title bar read "QUARTERLY REVIEW"?',
        },
        {
          id: "exactly-three-bullets",
          question: "Are there exactly three bullet points below the title?",
        },
        {
          id: "no-photos-or-charts",
          question:
            "Is the slide free of photos and charts (text and bullets only)?",
        },
      ],
    },
    {
      id: "photo-red-apple",
      kind: "adherence",
      category: "photo",
      prompt:
        "A photorealistic photograph of a single red apple resting on a wooden table, centred, in soft daylight. Photographic style, not an illustration or drawing.",
      constraints: [
        {
          id: "is-photorealistic",
          question:
            "Does the image look like a photograph rather than an illustration or drawing?",
        },
        {
          id: "single-apple",
          question: "Is there exactly one apple in the image?",
        },
        { id: "apple-is-red", question: "Is the apple red?" },
        {
          id: "on-wooden-surface",
          question: "Is the apple resting on a wooden surface?",
        },
      ],
    },
    {
      id: "character-cartoon-robot",
      kind: "adherence",
      category: "character",
      prompt:
        "A single cartoon robot character, front-facing and standing, with a rectangular body and exactly two antennae on its head, on a plain light background.",
      constraints: [
        {
          id: "single-robot",
          question: "Is there exactly one robot character?",
        },
        {
          id: "front-facing",
          question: "Is the robot facing forward (towards the viewer)?",
        },
        {
          id: "rectangular-body",
          question: "Is the robot's body rectangular?",
        },
        {
          id: "two-antennae",
          question: "Does the robot have exactly two antennae?",
        },
      ],
    },
    {
      id: "infographic-growth-bars",
      kind: "adherence",
      category: "infographic",
      prompt:
        'A flat vector infographic with a title reading "GROWTH" above a bar chart of exactly four vertical bars that increase in height from left to right, and a short one-line caption below the chart.',
      constraints: [
        {
          id: "has-bar-chart",
          question: "Is there a bar chart in the image?",
        },
        {
          id: "exactly-four-bars",
          question: "Does the bar chart have exactly four vertical bars?",
        },
        {
          id: "bars-increase-left-to-right",
          question: "Do the bars increase in height from left to right?",
        },
        {
          id: "title-reads-growth",
          question: 'Is there a title reading "GROWTH" above the chart?',
        },
      ],
    },
    {
      id: "meeting-document-minutes",
      kind: "adherence",
      category: "meeting-document",
      prompt:
        'A dense business meeting-minutes document page: a bold heading reading "MEETING MINUTES" at the top, at least three labelled sections of small body text, and a table with two or more columns. Black text on a white page.',
      constraints: [
        {
          id: "heading-reads-meeting-minutes",
          question: 'Is there a bold heading reading "MEETING MINUTES"?',
        },
        {
          id: "at-least-three-sections",
          question: "Are there at least three labelled sections of text?",
        },
        {
          id: "has-multi-column-table",
          question: "Is there a table with two or more columns?",
        },
        {
          id: "dense-small-text",
          question: "Is the page densely filled with small body text?",
        },
      ],
    },
  ],
};
