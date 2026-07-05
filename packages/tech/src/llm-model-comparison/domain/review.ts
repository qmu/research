// LLM-judge review shaping. After a configuration's trials complete, a fixed
// judge model reads the configuration's actual outputs and aggregated metrics and
// writes a short developer-facing review. The judge *call* is a vendor concern;
// this module is the pure part: building the judge prompt, declaring the review
// schema, and parsing the judge's response into a typed `Review`.

import type { Review } from "./types";

// Everything the judge is shown about one configuration: its identity, its
// measured metrics (already aggregated to means), and a handful of its actual
// trial outputs so the judge grounds the review in what the model really
// produced.
export type ReviewSubject = Readonly<{
  modelName: string;
  effort: string;
  throughputTokensPerSec: number;
  ttftMs: number;
  totalLatencyMs: number;
  maxSchemaDepth: number;
  maxSchemaBreadth: number;
  lengthAccuracy: number;
  sampleOutputs: ReadonlyArray<string>;
}>;

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;

// The JSON schema the judge is constrained to, so the response parses
// deterministically. Structured-output-safe (objects, string fields, no
// constraints).
export const reviewSchema = (): Record<string, unknown> => ({
  type: "object",
  properties: {
    strengths: { type: "string" },
    weaknesses: { type: "string" },
    bestFor: { type: "string" },
  },
  required: ["strengths", "weaknesses", "bestFor"],
  additionalProperties: false,
});

// Build the judge prompt from a configuration's metrics and sample outputs. Asks
// for a concise developer-facing verdict as JSON matching `reviewSchema()`.
export const buildReviewPrompt = (subject: ReviewSubject): string => {
  const samples = subject.sampleOutputs
    .map(
      (s, i) => `Output ${i + 1}: ${clip(s.replace(/\s+/g, " ").trim(), 240)}`,
    )
    .join("\n");
  return (
    `You are advising a developer choosing an LLM configuration. Review the ` +
    `model "${subject.modelName}" at effort level "${subject.effort}" for ` +
    `everyday development use.\n\n` +
    `Measured behavior (means over the trials):\n` +
    `- Sustained throughput: ${subject.throughputTokensPerSec.toFixed(1)} tokens/sec\n` +
    `- Time to first token: ${subject.ttftMs.toFixed(0)} ms\n` +
    `- Total response time: ${subject.totalLatencyMs.toFixed(0)} ms\n` +
    `- Tested max JSON-schema nesting depth: ${subject.maxSchemaDepth.toFixed(0)}\n` +
    `- Tested max JSON-schema field breadth: ${subject.maxSchemaBreadth.toFixed(0)}\n` +
    `- Length-instruction accuracy: ${(subject.lengthAccuracy * 100).toFixed(0)}%\n\n` +
    `Sample outputs:\n${samples || "(none)"}\n\n` +
    `Respond with a JSON object having "strengths", "weaknesses", and "bestFor" ` +
    `(what workloads this model+effort suits). Keep each to one or two sentences.`
  );
};

const asString = (v: unknown): string =>
  typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);

const parseJson = (raw: string): Record<string, unknown> | null => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const value = JSON.parse(raw.slice(start, end + 1));
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

// Parse the judge's raw response into a `Review`. Tolerant: if the response is
// not the expected JSON, the raw text is preserved and the fields are left empty
// rather than throwing, so one malformed review never aborts a run. `provenance`
// records whether this came from a live judge or the deterministic fixture judge.
export const parseReview = (
  raw: string,
  judgeModel: string,
  provenance: "judged" | "fixtured",
): Review => {
  const parsed = parseJson(raw);
  return {
    provenance,
    judgeModel,
    strengths: asString(parsed?.strengths),
    weaknesses: asString(parsed?.weaknesses),
    bestFor: asString(parsed?.bestFor),
    raw,
  };
};

// A placeholder review for a configuration that was not judged (e.g. every trial
// failed, so there is nothing to review).
export const skippedReview = (judgeModel: string): Review => ({
  provenance: "skipped",
  judgeModel,
  strengths: "",
  weaknesses: "",
  bestFor: "",
  raw: "",
});
