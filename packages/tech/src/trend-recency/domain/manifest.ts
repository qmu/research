import type { ProbeManifest } from "./types";

/**
 * The probe manifest — a version-pinned set of recent-event questions with
 * committed ground truth. Changing a probe is an instrument-version bump
 * (`version`), never a silent edit, exactly like the SVG prompt manifest and the
 * image-generation rubric.
 *
 * IMPORTANT — these v1 entries are ILLUSTRATIVE SEED probes that fix the schema
 * and let the keyless pipeline run end to end. The real instrument regenerates
 * the probe set for each trial from genuinely recent events in the trailing
 * `windowDays`, and commits that dated set (question + answer + citations) under
 * `docs/research-reports/trend-recency-history/` — the same accumulate-and-audit
 * pattern the availability topic uses. That generation is the first-trial ticket;
 * the seeds below use stable, low-controversy facts only so nothing false is
 * committed as ground truth.
 */
export const PROBE_MANIFEST: ProbeManifest = {
  version: "trend-recency-v1-seed",
  windowDays: 30,
  probes: [
    {
      id: "seed-opus-release",
      topic: "ai-models",
      question:
        "Which AI lab released the large language model named Claude Opus 4.8?",
      eventDateIso: "2026-01-01",
      expectedAnswer: "Anthropic",
      expectedKeywords: ["anthropic"],
    },
    {
      id: "seed-grok-maker",
      topic: "ai-models",
      question: "Which company develops the Grok family of language models?",
      eventDateIso: "2026-01-01",
      expectedAnswer: "xAI",
      expectedKeywords: ["xai"],
    },
    {
      id: "seed-sonar-maker",
      topic: "ai-models",
      question:
        "Which company offers the search-grounded model family named Sonar?",
      eventDateIso: "2026-01-01",
      expectedAnswer: "Perplexity",
      expectedKeywords: ["perplexity"],
    },
  ],
};
