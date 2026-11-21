import { describe, expect, it } from "vitest";
import { reproductionId } from "./identity";
import { reproductionCommand } from "./reproduction-command";

const conditions = {
  engine: "vllm",
  model: "llama-3.1-8b-instruct",
  fixture: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
};

describe("reproductionCommand", () => {
  it("builds the exact scoped command with the row's reproduction id", () => {
    const id = reproductionId(conditions);
    expect(reproductionCommand(conditions)).toBe(
      "npm run local-inference -- " +
        "--engine 'vllm' --model 'llama-3.1-8b-instruct' " +
        "--fixture 'fixture-2026-08-01' --runner-version 'runner-1.4.0' " +
        "--target-commit 'abcdef0123456789abcdef0123456789abcdef01' " +
        `--reproduction-id '${id}'`,
    );
  });

  it("is deterministic and matches the page's reproductionId for the same conditions", () => {
    expect(reproductionCommand(conditions)).toContain(
      reproductionId(conditions),
    );
    expect(reproductionCommand(conditions)).toBe(
      reproductionCommand({ ...conditions }),
    );
  });

  it("normalizes targetCommit letter case the same way the id does", () => {
    const upper = {
      ...conditions,
      targetCommit: conditions.targetCommit.toUpperCase(),
    };
    expect(reproductionCommand(upper)).toBe(reproductionCommand(conditions));
  });

  it("shell-quotes a value containing a single quote", () => {
    const command = reproductionCommand({
      ...conditions,
      model: "it's-a-model",
    });
    expect(command).toContain("--model 'it'\\''s-a-model'");
  });

  it.each(["engine", "model", "fixture", "runnerVersion"] as const)(
    "refuses to render when %s looks secret-like",
    (key) => {
      expect(() =>
        reproductionCommand({ ...conditions, [key]: "my-api-key" }),
      ).toThrow(/secret-like/);
    },
  );

  it("rejects invalid conditions before building a command", () => {
    expect(() => reproductionCommand({ ...conditions, engine: "" })).toThrow();
  });
});
