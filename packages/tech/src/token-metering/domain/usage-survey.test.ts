import { describe, expect, it } from "vitest";
import {
  FIXTURE_USAGE_SURVEY,
  renderUsageSurvey,
  type UsageSurvey,
} from "./usage-survey";

/**
 * The usage-field survey is the topic's post-hoc axis. Its one non-negotiable
 * property is that it never asserts a provider behaviour nobody observed: a
 * `fixtured` row declares what will be measured, and only a real response
 * produces a `measured` cell.
 */

describe("the keyless usage survey asserts nothing it has not observed", () => {
  it("carries every subject kind the survey is meant to span", () => {
    const kinds = new Set(FIXTURE_USAGE_SURVEY.rows.map((r) => r.kind));
    expect(kinds).toContain("direct-api");
    expect(kinds).toContain("agent-sdk");
    expect(kinds).toContain("domain-specific");
  });

  it("covers the direct provider APIs, an SDK layer and Perplexity", () => {
    const ids = FIXTURE_USAGE_SURVEY.rows.map((r) => r.id);
    for (const id of [
      "openai",
      "anthropic",
      "google-gemini",
      "xai",
      "agent-sdk",
      "perplexity",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("marks every keyless row fixtured", () => {
    for (const row of FIXTURE_USAGE_SURVEY.rows) {
      expect(row.provenance, row.id).toBe("fixtured");
    }
  });

  it("reports no availability it has not measured", () => {
    // The load-bearing anti-fabrication property: a keyless row may not claim
    // `reported` for any dimension. Documentation is not evidence.
    for (const row of FIXTURE_USAGE_SURVEY.rows) {
      expect(row.inputNonStreaming, row.id).toBe("unknown");
      expect(row.outputNonStreaming, row.id).toBe("unknown");
      expect(row.streaming, row.id).toBe("unknown");
      expect(row.extraFields, row.id).toEqual([]);
    }
  });

  it("gives every row evidence text", () => {
    for (const row of FIXTURE_USAGE_SURVEY.rows) {
      expect(row.evidence.length, row.id).toBeGreaterThan(0);
    }
  });
});

describe("renderUsageSurvey", () => {
  it("renders one row per subject under a stable header", () => {
    const markdown = renderUsageSurvey(FIXTURE_USAGE_SURVEY);
    expect(markdown).toContain("| Subject | Surface |");
    expect(markdown).toContain("| Extra fields | Provenance |");
    for (const row of FIXTURE_USAGE_SURVEY.rows) {
      expect(markdown).toContain(row.subject);
    }
  });

  it("is deterministic", () => {
    expect(renderUsageSurvey(FIXTURE_USAGE_SURVEY)).toBe(
      renderUsageSurvey(FIXTURE_USAGE_SURVEY),
    );
  });

  it("says plainly that nothing has been surveyed yet", () => {
    expect(renderUsageSurvey(FIXTURE_USAGE_SURVEY)).toContain(
      "No subject has been surveyed against a real response yet",
    );
  });

  it("names the exact streaming opt-in when one is required", () => {
    // The subtle case the ticket calls out: a streamed response that omits
    // usage unless asked. The opt-in is a first-class cell, not a footnote.
    const survey: UsageSurvey = {
      manifestVersion: "1",
      rows: [
        {
          ...FIXTURE_USAGE_SURVEY.rows[0],
          streaming: "opt-in-required",
          streamingOptIn: "stream_options.include_usage",
          provenance: "measured",
          extraFields: ["cached_tokens", "reasoning_tokens"],
        },
      ],
    };
    const markdown = renderUsageSurvey(survey);
    expect(markdown).toContain(
      "opt-in-required (`stream_options.include_usage`)",
    );
    expect(markdown).toContain("`cached_tokens`, `reasoning_tokens`");
    expect(markdown).toContain(
      "1 of 1 subject(s) surveyed against a real response",
    );
  });
});
