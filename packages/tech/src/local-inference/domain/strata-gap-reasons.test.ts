import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseComparisonResult, renderComparisonMarkdown } from "./comparison";

const sample = JSON.parse(
  readFileSync(
    new URL("../fixtures/comparison-sample.json", import.meta.url),
    "utf8",
  ),
);

function fixture() {
  return structuredClone(sample);
}

function strataRow(page: string) {
  const row = page.split("\n").find((line) => line.startsWith("| Strata |"));
  if (!row) throw new Error("Missing Strata row");
  return row;
}

describe("Strata per-metric gaps", () => {
  it.each(["ttft", "tps", "peak_rss"] as const)(
    "keeps all fixed reasons distinct for %s",
    (metric) => {
      for (const [reason, label] of [
        ["UNSUPPORTED", "未対応"],
        ["MEASURE-FAILED", "失敗"],
        ["NO-FIELD", "記録なし"],
        ["NOT-RUN", "記録なし"],
      ]) {
        const input = fixture();
        input.runs[0].metrics[metric] = {
          value: null,
          unit: "fixture-unit",
          reason,
        };
        const parsed = parseComparisonResult(input);
        expect(parsed.runs[0].metrics[metric]).toEqual({
          value: null,
          unit: "fixture-unit",
          reason,
        });
        const page = renderComparisonMarkdown(input);
        const text = `欠測 (${reason}) — ${label}`;
        expect(strataRow(page)).toContain(text);
        expect(page.split("## All engines")[0]).toContain(text);
      }
    },
  );

  it("shows three independent categories in the same failed Strata run", () => {
    const row = strataRow(renderComparisonMarkdown(fixture()));
    expect(row).toContain("欠測 (UNSUPPORTED) — 未対応");
    expect(row).toContain("欠測 (MEASURE-FAILED) — 失敗");
    expect(row).toContain("欠測 (NO-FIELD) — 記録なし");
    expect(row).toMatch(/\| UNREACHABLE \|$/);
  });

  it.each(["ttft", "tps", "peak_rss"] as const)(
    "preserves recorded zero for %s",
    (metric) => {
      const input = fixture();
      input.runs[0].metrics[metric] = {
        value: 0,
        unit: "fixture-unit",
        source: "client",
      };
      expect(strataRow(renderComparisonMarkdown(input))).toContain(
        "0 fixture-unit",
      );
    },
  );

  it.each([undefined, "", "FAILED", "unsupported"])(
    "rejects missing or unknown reason %s",
    (reason) => {
      const input = fixture();
      input.runs[0].metrics.ttft = { value: null, unit: "s", reason };
      expect(() => renderComparisonMarkdown(input)).toThrow(
        "Invalid gap reason",
      );
    },
  );

  it("rejects bare null rather than guessing unsupported", () => {
    const input = fixture();
    input.runs[0].metrics.ttft = null;
    expect(() => renderComparisonMarkdown(input)).toThrow("metrics.ttft");
  });

  it("does not change reasons when the overall run status changes", () => {
    const input = fixture();
    const failedRow = strataRow(renderComparisonMarkdown(input));
    input.runs[0].status = "measured";
    delete input.runs[0].failure;
    const measuredRow = strataRow(renderComparisonMarkdown(input));
    expect(
      measuredRow
        .replace("measured", "failed")
        .replace(/— \|$/, "UNREACHABLE |"),
    ).toBe(failedRow);
  });
});
