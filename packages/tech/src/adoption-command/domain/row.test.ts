import { describe, expect, it } from "vitest";
import {
  REPRODUCTION_COMMAND_ID,
  parseAdoptionCommandRow,
  resolveAdoptionCommand,
  serializeAdoptionCommandRow,
} from "./row";

const row = {
  id: "ollama-1",
  verdict: "adopted",
  commandId: REPRODUCTION_COMMAND_ID,
  engineVersion: "ollama-0.6.2",
  model: "qwen2.5:7b",
  fixtureVersion: "fixture-v1",
  runnerVersion: "runner-v1",
} as const;

describe("adoption command reference", () => {
  it.each(["adopted", "rejected"])(
    "round-trips a %s row without command text",
    (verdict) => {
      const saved = serializeAdoptionCommandRow({
        ...row,
        verdict,
        command: "arbitrary-shell-body",
        extra: "private-data",
      });
      expect(saved).not.toContain("arbitrary-shell-body");
      expect(saved).not.toContain("private-data");
      expect(JSON.parse(saved)).toEqual({ ...row, verdict });
      expect(
        resolveAdoptionCommand(parseAdoptionCommandRow(JSON.parse(saved))),
      ).toBe(
        "npm run local-inference -- --engine-version 'ollama-0.6.2' --model 'qwen2.5:7b' --fixture-version 'fixture-v1' --runner-version 'runner-v1'",
      );
    },
  );

  it("serializes deterministically regardless of input key order", () => {
    expect(
      serializeAdoptionCommandRow(
        Object.fromEntries(Object.entries(row).reverse()),
      ),
    ).toBe(serializeAdoptionCommandRow(row));
  });

  it.each([
    undefined,
    "",
    "toString",
    "__proto__",
    "local-inference.reproduce.v2",
    "npm run local-inference",
  ])("rejects unknown command ID %s without fallback", (commandId) => {
    expect(() => serializeAdoptionCommandRow({ ...row, commandId })).toThrow(
      "unknown-reproduction-command-id",
    );
    expect(() =>
      resolveAdoptionCommand({ ...row, commandId } as typeof row),
    ).toThrow("unknown-reproduction-command-id");
  });

  it.each(["engineVersion", "model", "fixtureVersion", "runnerVersion"])(
    "validates %s on save and resolution",
    (field) => {
      for (const value of [
        undefined,
        "",
        "$(touch /tmp/x)",
        "a'b",
        "x\ncommand",
        "--flag",
        "api-token",
        "x`id`",
        "x".repeat(201),
      ]) {
        const invalid = { ...row, [field]: value };
        expect(() => serializeAdoptionCommandRow(invalid)).toThrow(
          "invalid-public-condition",
        );
        expect(() => resolveAdoptionCommand(invalid)).toThrow(
          "invalid-public-condition",
        );
      }
    },
  );

  it.each([null, [], "text", {}, { ...row, verdict: "unknown" }])(
    "rejects malformed row %j",
    (input) => {
      expect(() => parseAdoptionCommandRow(input)).toThrow();
    },
  );

  it("keeps the template ID stable when public conditions change", () => {
    const changed = parseAdoptionCommandRow({ ...row, model: "qwen2.5:14b" });
    expect(changed.commandId).toBe(row.commandId);
    expect(resolveAdoptionCommand(changed)).toContain("--model 'qwen2.5:14b'");
  });
});
