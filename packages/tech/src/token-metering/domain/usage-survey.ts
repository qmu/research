/**
 * The usage-field survey axis: does a provider's API response report the tokens
 * it ACTUALLY consumed, and how?
 *
 * This is the topic's second capability, and it is deliberately distinct from
 * the first:
 *
 *   - **Pre-flight prediction** (the counting axis): predict the INPUT tokens a
 *     prompt will bill for, before sending it, without the provider's tokenizer
 *     library. Input-only by necessity — output tokens do not exist yet.
 *   - **Post-hoc actual usage** (this axis): read the consumed input AND output
 *     tokens back off the response, after the call.
 *
 * The article previously described the topic as "input only", which conflated
 * the two: output tokens are not out of scope for the topic, they are simply
 * unavailable to the pre-flight method. This axis states, per subject, exactly
 * which usage fields a response reports.
 *
 * Pure data + pure rendering. Every cell is a claim about a provider's API, so
 * each row carries its own provenance: a `fixtured` row is a keyless
 * placeholder recording what the survey WILL measure, never a synthesized
 * "yes". Real cells come only from a real response.
 */

/** Whether a usage figure comes back, and on what terms. */
export type UsageAvailability =
  /** Present in the response without asking for it. */
  | "reported"
  /** Present only when the request opts in (see `streamingOptIn`). */
  | "opt-in-required"
  /** Not present at all on this surface. */
  | "not-reported"
  /** Not yet observed — the keyless path cannot see it. */
  | "unknown";

/** What an SDK/wrapper layer does to the provider's usage figures. */
export type SdkUsageHandling =
  | "preserved"
  | "aggregated"
  | "dropped"
  | "unknown"
  | "not-applicable";

export type UsageProvenance = "measured" | "fixtured";

export type UsageSurveyRow = Readonly<{
  /** Stable id, used for ordering and for matching a real result onto the row. */
  id: string;
  /** Display name of the surveyed surface. */
  subject: string;
  /** Which kind of surface this is — the survey deliberately spans three. */
  kind: "direct-api" | "agent-sdk" | "domain-specific";
  /** Consumed INPUT tokens on a non-streaming response. */
  inputNonStreaming: UsageAvailability;
  /** Consumed OUTPUT tokens on a non-streaming response. */
  outputNonStreaming: UsageAvailability;
  /** Usage on a STREAMED response — the subtle case; several providers omit it
   * unless explicitly requested, which is recorded here as a first-class
   * result rather than a footnote. */
  streaming: UsageAvailability;
  /** The exact opt-in a streamed response needs, when it needs one. */
  streamingOptIn: string | null;
  /** What the reachable SDK layer does with the figures a builder would get. */
  sdkHandling: SdkUsageHandling;
  /** Extra usage fields beyond plain input/output (cached input, reasoning
   * tokens, search units …), named exactly as the response names them. */
  extraFields: ReadonlyArray<string>;
  /** `measured` only from an observed real response. */
  provenance: UsageProvenance;
  /** What was actually observed, or — on the keyless path — what will be. */
  evidence: string;
}>;

export type UsageSurvey = Readonly<{
  manifestVersion: string;
  rows: ReadonlyArray<UsageSurveyRow>;
}>;

export const USAGE_SURVEY_MANIFEST_VERSION = "1";

/**
 * The keyless subject set. Every row is `fixtured`: it declares the subject and
 * the dimensions the real survey will fill, with `unknown` wherever a real
 * response is required to answer. Nothing here asserts a provider behaviour
 * that has not been observed — the one thing this axis must never do.
 *
 * The subject list spans the three surface kinds the ticket named: the direct
 * provider APIs, at least one agent-SDK layer, and the domain-specific case
 * (Perplexity, which bills search separately from tokens).
 */
export const FIXTURE_USAGE_SURVEY: UsageSurvey = {
  manifestVersion: USAGE_SURVEY_MANIFEST_VERSION,
  rows: [
    {
      id: "openai",
      subject: "OpenAI (Chat Completions / Responses)",
      kind: "direct-api",
      inputNonStreaming: "unknown",
      outputNonStreaming: "unknown",
      streaming: "unknown",
      streamingOptIn: null,
      sdkHandling: "unknown",
      extraFields: [],
      provenance: "fixtured",
      evidence:
        "Keyless placeholder. The real survey reads the response `usage` object and records whether a streamed call needs an explicit opt-in.",
    },
    {
      id: "anthropic",
      subject: "Anthropic (Messages)",
      kind: "direct-api",
      inputNonStreaming: "unknown",
      outputNonStreaming: "unknown",
      streaming: "unknown",
      streamingOptIn: null,
      sdkHandling: "unknown",
      extraFields: [],
      provenance: "fixtured",
      evidence:
        "Keyless placeholder. The real survey records the `usage` fields on a message response and on the streamed event sequence.",
    },
    {
      id: "google-gemini",
      subject: "Google Gemini (generateContent)",
      kind: "direct-api",
      inputNonStreaming: "unknown",
      outputNonStreaming: "unknown",
      streaming: "unknown",
      streamingOptIn: null,
      sdkHandling: "unknown",
      extraFields: [],
      provenance: "fixtured",
      evidence:
        "Keyless placeholder. The real survey records the usage metadata returned with a generation and with a streamed generation.",
    },
    {
      id: "xai",
      subject: "xAI (Responses / Agent Tools)",
      kind: "direct-api",
      inputNonStreaming: "unknown",
      outputNonStreaming: "unknown",
      streaming: "unknown",
      streamingOptIn: null,
      sdkHandling: "unknown",
      extraFields: [],
      provenance: "fixtured",
      evidence:
        "Keyless placeholder. The real survey records the usage fields on a response and whether grounded calls report search units separately.",
    },
    {
      id: "agent-sdk",
      subject: "Agent SDK layer (wrapper over a direct API)",
      kind: "agent-sdk",
      inputNonStreaming: "unknown",
      outputNonStreaming: "unknown",
      streaming: "unknown",
      streamingOptIn: null,
      sdkHandling: "unknown",
      extraFields: [],
      provenance: "fixtured",
      evidence:
        "Keyless placeholder. A wrapper may drop, rename, or aggregate the provider's usage across a multi-step run; the survey records what the REACHABLE layer exposes, which is what a builder on that SDK actually gets.",
    },
    {
      id: "perplexity",
      subject: "Perplexity (Sonar)",
      kind: "domain-specific",
      inputNonStreaming: "unknown",
      outputNonStreaming: "unknown",
      streaming: "unknown",
      streamingOptIn: null,
      sdkHandling: "not-applicable",
      extraFields: [],
      provenance: "fixtured",
      evidence:
        "Keyless placeholder. Perplexity bills search separately from tokens, so the survey records whether search units are reported alongside token usage.",
    },
  ],
};

// --- rendering ---------------------------------------------------------------

const cell = (value: string): string => value.replace(/\|/g, "\\|");

const availabilityLabel = (
  value: UsageAvailability,
  optIn: string | null,
): string =>
  value === "opt-in-required" && optIn !== null
    ? `opt-in-required (\`${optIn}\`)`
    : value;

const extraFieldsLabel = (fields: ReadonlyArray<string>): string =>
  fields.length === 0 ? "—" : fields.map((f) => `\`${f}\``).join(", ");

/**
 * Render the usage survey as a per-subject table with provenance on every row.
 * Deterministic: the same survey always renders byte-identically.
 */
export const renderUsageSurvey = (survey: UsageSurvey): string => {
  const header =
    "| Subject | Surface | Input (non-streaming) | Output (non-streaming) | Streaming | SDK layer | Extra fields | Provenance |\n" +
    "| ------- | ------- | --------------------- | ---------------------- | --------- | --------- | ------------ | ---------- |";
  const rows = survey.rows.map(
    (row) =>
      `| ${cell(row.subject)} | ${row.kind} | ${row.inputNonStreaming} | ` +
      `${row.outputNonStreaming} | ${cell(
        availabilityLabel(row.streaming, row.streamingOptIn),
      )} | ${row.sdkHandling} | ${extraFieldsLabel(row.extraFields)} | ${
        row.provenance
      } |`,
  );
  const measured = survey.rows.filter(
    (r) => r.provenance === "measured",
  ).length;
  const note =
    measured === 0
      ? "_No subject has been surveyed against a real response yet. Every row is a `fixtured` placeholder " +
        "declaring what the survey will record; no availability is asserted from documentation alone._"
      : `_${measured} of ${survey.rows.length} subject(s) surveyed against a real response; the remainder are \`fixtured\` placeholders._`;
  return `${header}\n${rows.join("\n")}\n\n${note}`;
};
