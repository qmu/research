import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/comparison.json";
import { renderInferenceReport } from "./report";

const invoke = (command: "validate" | "render", args: string[]) =>
  spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      `src/entrypoints/${command}-local-inference.ts`,
      ...args,
    ],
    { encoding: "utf8" },
  );

const invalid = [
  ["malformed JSON", "{"],
  ["unknown version", JSON.stringify({ ...fixture, schemaVersion: 2 })],
  [
    "missing gap reason",
    JSON.stringify({
      ...fixture,
      runs: [{ ...fixture.runs[0], speed: { value: null } }],
    }),
  ],
  [
    "unknown gap reason",
    JSON.stringify({
      ...fixture,
      runs: [
        { ...fixture.runs[0], quality: { value: null, reason: "unknown" } },
      ],
    }),
  ],
  [
    "out-of-range quality",
    JSON.stringify({
      ...fixture,
      runs: [{ ...fixture.runs[0], quality: { value: 2 } }],
    }),
  ],
  [
    "duplicate identity",
    JSON.stringify({ ...fixture, runs: [fixture.runs[0], fixture.runs[0]] }),
  ],
  [
    "invalid final row",
    JSON.stringify({
      ...fixture,
      runs: [...fixture.runs, { ...fixture.runs[0], id: "last", model: "" }],
    }),
  ],
];

describe("shared inference validation preflight", () => {
  it("accepts the fixture and produces the same deterministic table on stdout and disk", () => {
    const input = "src/local-inference/fixtures/comparison.json";
    const before = readFileSync(input);
    const dir = mkdtempSync(join(tmpdir(), "inference-valid-"));
    try {
      const validation = invoke("validate", [input]);
      expect(validation.status, validation.stderr).toBe(0);
      expect(validation.stdout).toBe("");
      const expected = renderInferenceReport(fixture);
      const stdout = invoke("render", [input]);
      expect(stdout.status, stdout.stderr).toBe(0);
      expect(stdout.stdout).toBe(expected);
      const output = join(dir, "comparison.md");
      const file = invoke("render", [input, output]);
      expect(file.status, file.stderr).toBe(0);
      expect(file.stdout).toBe("");
      expect(readFileSync(output, "utf8")).toBe(expected);
      expect(readFileSync(input)).toEqual(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(invalid)(
    "rejects %s without creating, truncating or printing a comparison",
    (_name, json) => {
      const dir = mkdtempSync(join(tmpdir(), "inference-invalid-"));
      try {
        const input = join(dir, "input.json");
        const output = join(dir, "comparison.md");
        writeFileSync(input, json);
        const validation = invoke("validate", [input]);
        expect(validation.status).toBe(1);
        expect(validation.stderr).not.toBe("");
        expect(validation.stdout).toBe("");
        for (const args of [[input], [input, output]]) {
          const result = invoke("render", args);
          expect(result.status).toBe(validation.status);
          expect(result.stdout).toBe("");
          expect(result.stderr).not.toBe("");
        }
        expect(existsSync(output)).toBe(false);
        const previous = Buffer.from("previous comparison\n");
        writeFileSync(output, previous);
        expect(invoke("render", [input, output]).status).toBe(1);
        expect(readFileSync(output)).toEqual(previous);
        expect(readFileSync(input, "utf8")).toBe(json);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it("rejects missing files and invalid arguments before writing", () => {
    for (const command of ["validate", "render"] as const) {
      for (const args of [[], ["does-not-exist.json"], ["a", "b", "c"]]) {
        const result = invoke(command, args);
        expect(result.status).toBe(1);
        expect(result.stdout).toBe("");
      }
    }
  });
});
