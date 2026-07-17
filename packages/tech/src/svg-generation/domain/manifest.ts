import type { PromptManifest } from "./types";

/**
 * The prompt manifest — the fixed set of drawing tasks every subject is asked to
 * produce, so scores stay comparable across models and across surveys. Changing
 * a prompt or a rubric constraint is an instrument-version bump (`version`),
 * not a silent edit, exactly like the image-generation rubric manifest.
 *
 * v1 kept a small, mechanically-scorable spread: `static` prompts exercise
 * render validity and path complexity; `animated` prompts additionally exercise
 * animation presence (SMIL or CSS). v2 adds the prompt-fidelity rubric: each
 * prompt carries mechanically-checkable yes/no constraints the fixed vision
 * judge answers over the *rasterized* drawing. The judge sees a still frame,
 * so constraints address what is drawn — whether it moves stays the
 * source-level animation-presence metric.
 */
export const PROMPT_MANIFEST: PromptManifest = {
  version: "svg-v2",
  prompts: [
    {
      id: "static-weather-icon",
      kind: "static",
      prompt:
        "Draw a flat weather icon of a sun partly behind a single cloud, on a transparent background, using a 0 0 100 100 viewBox.",
      constraints: [
        { id: "has-sun", question: "Does the drawing show a sun?" },
        {
          id: "has-single-cloud",
          question: "Does the drawing show exactly one cloud?",
        },
        {
          id: "sun-behind-cloud",
          question: "Is the sun partly hidden behind the cloud?",
        },
      ],
    },
    {
      id: "static-bar-chart",
      kind: "static",
      prompt:
        "Draw a simple vertical bar chart with four bars of increasing height and a baseline axis, using a 0 0 200 120 viewBox.",
      constraints: [
        {
          id: "four-bars",
          question: "Does the drawing show exactly four vertical bars?",
        },
        {
          id: "increasing-height",
          question: "Do the bars increase in height from left to right?",
        },
        {
          id: "baseline-axis",
          question: "Is there a horizontal baseline axis under the bars?",
        },
      ],
    },
    {
      id: "static-logo-monogram",
      kind: "static",
      prompt:
        "Draw a minimalist geometric monogram of the letter Q inside a circle, two colors only, using a 0 0 100 100 viewBox.",
      constraints: [
        {
          id: "shows-letter-q",
          question: "Does the drawing show the letter Q?",
        },
        {
          id: "inside-circle",
          question: "Is the letter placed inside a circle?",
        },
        {
          id: "two-colors",
          question: "Does the drawing use at most two colors?",
        },
      ],
    },
    {
      id: "animated-loading-spinner",
      kind: "animated",
      prompt:
        "Draw a loading spinner: an arc that rotates continuously. Animate the rotation so it loops forever. Use a 0 0 100 100 viewBox.",
      constraints: [
        {
          id: "has-arc",
          question:
            "Does the drawing show an arc or partial ring (an open circular stroke)?",
        },
        {
          id: "spinner-like",
          question:
            "Does the drawing look like a loading spinner rather than a full solid circle?",
        },
      ],
    },
    {
      id: "animated-pulsing-heart",
      kind: "animated",
      prompt:
        "Draw a heart that pulses — scaling up and down smoothly and repeatedly. Animate the pulse so it loops forever. Use a 0 0 100 100 viewBox.",
      constraints: [
        {
          id: "has-heart",
          question: "Does the drawing show a heart shape?",
        },
        {
          id: "heart-only-subject",
          question: "Is the heart the main and only subject of the drawing?",
        },
      ],
    },
  ],
};
