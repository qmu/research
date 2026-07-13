import type { PromptManifest } from "./types";

/**
 * The prompt manifest — the fixed set of drawing tasks every subject is asked to
 * produce, so scores stay comparable across models and across surveys. Changing
 * a prompt is an instrument-version bump (`version`), not a silent edit, exactly
 * like the image-generation rubric manifest.
 *
 * v1 keeps a small, mechanically-scorable spread: `static` prompts exercise
 * render validity and path complexity; `animated` prompts additionally exercise
 * animation presence (SMIL or CSS). The prompts name concrete, checkable shapes
 * so the later vision-judge fidelity metric has an unambiguous target.
 */
export const PROMPT_MANIFEST: PromptManifest = {
  version: "svg-v1",
  prompts: [
    {
      id: "static-weather-icon",
      kind: "static",
      prompt:
        "Draw a flat weather icon of a sun partly behind a single cloud, on a transparent background, using a 0 0 100 100 viewBox.",
    },
    {
      id: "static-bar-chart",
      kind: "static",
      prompt:
        "Draw a simple vertical bar chart with four bars of increasing height and a baseline axis, using a 0 0 200 120 viewBox.",
    },
    {
      id: "static-logo-monogram",
      kind: "static",
      prompt:
        "Draw a minimalist geometric monogram of the letter Q inside a circle, two colors only, using a 0 0 100 100 viewBox.",
    },
    {
      id: "animated-loading-spinner",
      kind: "animated",
      prompt:
        "Draw a loading spinner: an arc that rotates continuously. Animate the rotation so it loops forever. Use a 0 0 100 100 viewBox.",
    },
    {
      id: "animated-pulsing-heart",
      kind: "animated",
      prompt:
        "Draw a heart that pulses — scaling up and down smoothly and repeatedly. Animate the pulse so it loops forever. Use a 0 0 100 100 viewBox.",
    },
  ],
};
