import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  publicationAnchor,
  renderPublicationSections,
  type PublicationSections,
} from "./markdown.js";

const input: PublicationSections = {
  engines: [
    {
      key: "llama.cpp",
      label: "llama.cpp server",
      description: "Synthetic example only.",
    },
  ],
  metrics: [
    {
      key: "ttft_ms",
      label: "Time to first token",
      description: "Milliseconds; lower is better.",
    },
  ],
  "reason-codes": [
    {
      key: "missing",
      label: "Missing evidence",
      description: "No adoption decision can be inferred.",
    },
  ],
};

describe("public adoption anchors", () => {
  it("emits all section and entry targets with a fixed public namespace", () => {
    const md = renderPublicationSections(input);
    for (const section of ["engines", "metrics", "reason-codes"] as const) {
      expect(md).toContain(`<a id="adoption-${section}"></a>`);
      expect(md).toContain(
        `<a id="${publicationAnchor(section, input[section].map((entry) => entry.key)[0])}"></a>`,
      );
    }
    expect(md.indexOf("## Engines")).toBeLessThan(md.indexOf("## Metrics"));
    expect(md.indexOf("## Metrics")).toBeLessThan(
      md.indexOf("## Reason codes"),
    );
  });
  it("keeps identifiers when labels change or entries reorder", () => {
    const entry = {
      key: "llama.cpp",
      label: "llama.cpp server",
      description: "Synthetic example only.",
    };
    const changed = renderPublicationSections({
      ...input,
      engines: [
        { key: "other", label: "Other", description: "Example" },
        { ...entry, label: "日本語表示" },
      ],
    });
    expect(changed).toContain(
      `<a id="${publicationAnchor("engines", entry.key)}"></a>`,
    );
    expect(publicationAnchor("engines", "a.b")).not.toBe(
      publicationAnchor("engines", "a-b"),
    );
    expect(publicationAnchor("engines", "missing")).not.toBe(
      publicationAnchor("reason-codes", "missing"),
    );
  });
  it.each([
    "",
    "space key",
    'x\" onclick=\"bad',
    "../x",
    "日本語",
    "a".repeat(129),
  ])("rejects unsafe keys: %s", (key) => {
    expect(() => publicationAnchor("engines", key)).toThrow();
  });
  it("rejects duplicates rather than assigning order-dependent suffixes", () => {
    expect(() =>
      renderPublicationSections({
        ...input,
        engines: [...input.engines, ...input.engines],
      }),
    ).toThrow("Duplicate");
  });
  it("escapes display text so it cannot introduce anchors or headings", () => {
    const md = renderPublicationSections({
      ...input,
      engines: [
        {
          key: "safe",
          label: '<a id="evil">',
          description: "**text** & <script>",
        },
      ],
    });
    expect(md).not.toContain('<a id="evil">');
    expect(md).not.toContain("<script>");
    expect(() =>
      renderPublicationSections({
        ...input,
        engines: [{ key: "safe", label: "a\n## injected", description: "x" }],
      }),
    ).toThrow();
  });
  it("keeps the published sample in sync with actual output", () => {
    expect(readFileSync("../../docs/publication-anchors.md", "utf8")).toContain(
      renderPublicationSections(input),
    );
  });
  it.each([undefined, null, 123])(
    "rejects missing or non-string entry keys: %s",
    (key) => {
      const invalid = JSON.parse(
        JSON.stringify({
          ...input,
          engines: [{ key, label: "Example", description: "Example" }],
        }),
      ) as PublicationSections;
      expect(() => renderPublicationSections(invalid)).toThrow();
    },
  );
  it("preserves empty section targets", () => {
    const md = renderPublicationSections({
      engines: [],
      metrics: [],
      "reason-codes": [],
    });
    expect(md.match(/<a id=/g)).toHaveLength(3);
    expect(md).not.toContain("### ");
  });
  it("CLI renders the documented input example", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx/esm", "src/entrypoints/render-publication-anchors.ts"],
      {
        input: readFileSync(
          "src/publication-anchors/examples/sections.json",
          "utf8",
        ),
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(renderPublicationSections(input));
    expect(result.stderr).toBe("");
  });
  it("CLI prints no partial output or sensitive input on invalid later entries", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx/esm", "src/entrypoints/render-publication-anchors.ts"],
      {
        input: JSON.stringify({
          ...input,
          "reason-codes": [
            { key: "unsafe secret", label: "private", description: "private" },
          ],
        }),
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("Invalid public adoption sections\n");
  });
});
