import type { ProbeManifest } from "./types";

/**
 * The probe manifest — a version-pinned set of recent-event questions with
 * committed ground truth. Changing a probe is an instrument-version bump
 * (`version`), never a silent edit, exactly like the SVG prompt manifest and the
 * image-generation rubric.
 *
 * v2 (2026-07-17) is the FIRST REAL trailing-window probe set, curated for the
 * first validation trial: three events from the 30 days before 2026-07-17, each
 * verified against dated public sources. The audit record — question, ground
 * truth, and the sources backing it — is committed as
 * `docs/research-reports/trend-recency-history/2026-07-17-trend-recency-v2-20260717.json`
 * (the accumulate-and-audit pattern the availability topic uses). Later trials
 * draw a fresh set from their own trailing window and bump the version again,
 * so the metric stays "events from the last `windowDays` days relative to this
 * trial" by construction. `expectedKeywords` avoid short tokens that could
 * substring-match unrelated words (the scorer matches normalized substrings).
 */
export const PROBE_MANIFEST: ProbeManifest = {
  version: "trend-recency-v2-20260717",
  windowDays: 30,
  probes: [
    {
      id: "20260712-wimbledon-mens-champion",
      topic: "sports",
      question:
        "Who won the men's singles title at the 2026 Wimbledon Championships?",
      eventDateIso: "2026-07-12",
      expectedAnswer: "Jannik Sinner",
      expectedKeywords: ["sinner"],
    },
    {
      id: "20260715-world-cup-finalists",
      topic: "sports",
      question:
        "Which two national teams reached the final of the 2026 FIFA World Cup?",
      eventDateIso: "2026-07-15",
      expectedAnswer: "Argentina and Spain",
      expectedKeywords: ["argentina", "spain"],
    },
    {
      id: "20260709-gpt-5-6-variants",
      topic: "ai-models",
      question:
        "What are the names of the three model variants in OpenAI's GPT-5.6 family, released in July 2026?",
      eventDateIso: "2026-07-09",
      expectedAnswer: "Sol, Terra, and Luna",
      expectedKeywords: ["terra", "luna"],
    },
  ],
};
