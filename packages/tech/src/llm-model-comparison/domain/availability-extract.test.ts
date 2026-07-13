import { describe, expect, it } from "vitest";
import {
  buildExtractionPrompt,
  parseExtraction,
  readableStatusText,
} from "./availability-extract";

describe("readableStatusText", () => {
  it("slims a Statuspage incidents feed to core fields", () => {
    const body = JSON.stringify({
      incidents: [
        {
          id: "abc",
          name: "Elevated errors",
          impact: "major",
          status: "resolved",
          created_at: "2026-07-08T00:00:00Z",
          resolved_at: "2026-07-08T02:00:00Z",
          components: [{ name: "API" }, { name: "Console" }],
          incident_updates: [{ body: "We are investigating." }],
          shortlink: "https://x/i",
        },
      ],
    });
    const out = readableStatusText(body, "statuspage-json");
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].components).toEqual(["API", "Console"]);
    expect(parsed[0].latest_update).toBe("We are investigating.");
  });

  it("strips HTML to visible text", () => {
    const out = readableStatusText(
      "<html><body><h1>Status</h1><script>ignore()</script> Operational</body></html>",
      "html",
    );
    expect(out).toContain("Status");
    expect(out).toContain("Operational");
    expect(out).not.toContain("ignore");
  });
});

describe("parseExtraction", () => {
  it("parses fenced JSON, maps impact, and keeps provider id", () => {
    const answer =
      "```json\n" +
      JSON.stringify({
        incidents: [
          {
            id: "prov-1",
            title: "API outage",
            impact: "CRITICAL",
            affectedProducts: ["API"],
            startedAt: "2026-07-08T00:00:00Z",
            endedAt: null,
          },
        ],
      }) +
      "\n```";
    const out = parseExtraction(answer, "openai");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("prov-1");
    expect(out[0].impact).toBe("critical");
    expect(out[0].endedAt).toBeNull();
    expect(out[0].startedAt).toBe("2026-07-08T00:00:00.000Z");
  });

  it("tolerates surrounding prose and derives a stable id when none given", () => {
    const answer =
      'Here is the data: {"incidents":[{"title":"Degraded search","impact":"minor","startedAt":"2026-07-01T10:00:00Z"}]} done.';
    const out = parseExtraction(answer, "google");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("google:2026-07-01T10:00:00.000Z:degraded-search");
    expect(out[0].impact).toBe("minor");
  });

  it("drops entries without a title or start time; maps unknown impact", () => {
    const answer = JSON.stringify({
      incidents: [
        { title: "No start" },
        { startedAt: "2026-07-01T00:00:00Z" },
        {
          title: "Weird",
          impact: "catastrophe",
          startedAt: "2026-07-02T00:00:00Z",
        },
      ],
    });
    const out = parseExtraction(answer, "anthropic");
    expect(out).toHaveLength(1);
    expect(out[0].impact).toBe("unknown");
  });
});

describe("buildExtractionPrompt", () => {
  it("names the provider, format, and asOf, and includes the content", () => {
    const prompt = buildExtractionPrompt(
      "OpenAI",
      "openai",
      "statuspage-json",
      "[CONTENT]",
      "2026-07-09T00:00:00.000Z",
    );
    expect(prompt).toContain("OpenAI");
    expect(prompt).toContain("statuspage-json");
    expect(prompt).toContain("2026-07-09T00:00:00.000Z");
    expect(prompt).toContain("[CONTENT]");
    expect(prompt).toContain('"incidents"');
  });
});
