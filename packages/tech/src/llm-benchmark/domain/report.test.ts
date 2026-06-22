import { describe, it, expect } from "vitest";
import { renderReport } from "./report";
import { summarize } from "./score";
import type { Grade } from "./types";

const grades: ReadonlyArray<Grade> = [
  { id: "a", expected: "Paris", output: "Paris", correct: true },
  { id: "b", expected: "Tokyo", output: "Kyoto", correct: false },
];

describe("renderReport", () => {
  const page = renderReport(
    summarize("test-model", grades),
    "2026-06-22T00:00:00Z",
  );

  it("starts with frontmatter carrying a non-empty description", () => {
    expect(page.startsWith("---\n")).toBe(true);
    expect(page).toMatch(/\ndescription: \S.*\n/);
  });

  it("reports the model and accuracy", () => {
    expect(page).toContain("`test-model`");
    expect(page).toContain("50.0% (1/2)");
  });

  it("includes a row per task", () => {
    expect(page).toContain("| a | correct |");
    expect(page).toContain("| b | wrong |");
  });
});
