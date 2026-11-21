import { describe, expect, it } from "vitest";
import { reproductionId } from "./identity";
import { parseAdoptionRowFile } from "./adoption-row";
import { renderAdoptionPage } from "./adoption-page";

const adopted = {
  engine: "vllm",
  model: "llama-3.1-8b-instruct",
  fixture: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
};

const rejected = {
  engine: "ollama",
  model: "llama-3.1-8b-instruct",
  fixture: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
};

const rows = parseAdoptionRowFile({
  schemaVersion: 1,
  rows: [
    { ...adopted, verdict: "adopted" },
    { ...rejected, verdict: "rejected", reasonCode: "QUALITY-BELOW-THRESHOLD" },
  ],
});

describe("renderAdoptionPage", () => {
  it("renders the title and both rows", () => {
    const page = renderAdoptionPage(rows);
    expect(page).toContain("# Local inference adoption");
    expect(page).toContain("採用");
    expect(page).toContain("不採用");
    expect(page).toContain("QUALITY-BELOW-THRESHOLD");
  });

  it("shows each row's reproduction id in the table and links it to its own command section", () => {
    const page = renderAdoptionPage(rows);
    const adoptedId = reproductionId(adopted);
    expect(page).toContain(`[${adoptedId}](#${adoptedId})`);
    expect(page).toContain(`### ${adoptedId}`);
  });

  it("embeds the same reproduction id inside each row's reproduction command", () => {
    const page = renderAdoptionPage(rows);
    const rejectedId = reproductionId(rejected);
    const sectionStart = page.indexOf(`### ${rejectedId}`);
    expect(sectionStart).toBeGreaterThan(-1);
    const section = page.slice(sectionStart, sectionStart + 400);
    expect(section).toContain("npm run local-inference --");
    expect(section).toContain(`--reproduction-id '${rejectedId}'`);
  });

  it("sorts rows by reproductionId independent of input order", () => {
    const reversed = renderAdoptionPage([...rows].reverse());
    expect(reversed).toBe(renderAdoptionPage(rows));
  });

  it("escapes a pipe and newline in a text field", () => {
    const weird = parseAdoptionRowFile({
      schemaVersion: 1,
      rows: [
        {
          ...adopted,
          fixture: "fixture-2026-08-01",
          model: "weird|model\nname",
          verdict: "adopted",
        },
      ],
    });
    expect(renderAdoptionPage(weird)).toContain("weird\\|model name");
  });
});
