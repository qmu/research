import { describe, expect, it } from "vitest";
import {
  noopPolicy,
  oracleCoversEveryTask,
  oraclePolicy,
} from "./oracle-policy";
import { TASK_SUITE } from "../domain/manifest";
import type {
  ComputerUseTaskInput,
  HarnessObservation,
} from "../../vendors/llm/types";

const taskInput = (id: string, goal = "goal"): ComputerUseTaskInput => ({
  id,
  goal,
  startUrl: `computer-use-fixture-site@1/start`,
});

const observation = (
  over: Partial<HarnessObservation> = {},
): HarnessObservation => ({
  stepIndex: 0,
  url: "http://127.0.0.1/start",
  pageText: "",
  axSnapshot: "",
  viewport: { width: 1280, height: 800 },
  ...over,
});

describe("oracle policy — keyless self-test brain", () => {
  it("scripts a solve for every committed suite task", () => {
    expect(oracleCoversEveryTask()).toBe(true);
  });

  it("issues a non-finish first command then eventually finishes, for every task", async () => {
    for (const task of TASK_SUITE.tasks) {
      const attempt = oraclePolicy.begin(taskInput(task.id));
      const first = await attempt.next(observation());
      expect(first.command.kind, task.id).not.toBe("finish");
      // Drain the script; it must terminate with a finish within the suite's
      // small step budget rather than looping forever.
      let terminated = false;
      for (let step = 0; step < 10; step += 1) {
        const next = await attempt.next(observation());
        if (next.command.kind === "finish") {
          terminated = true;
          break;
        }
      }
      expect(terminated, task.id).toBe(true);
    }
  });

  it("reads the extraction total off the OBSERVED page, not a constant", async () => {
    const attempt = oraclePolicy.begin(taskInput("confirm-order-total"));
    const step = await attempt.next(
      observation({ pageText: "Subtotal: $58 Shipping: $5 Order total: $63" }),
    );
    expect(step.command.kind).toBe("type");
    expect(step.command.selector).toBe("#confirm-total");
    expect(step.command.text).toBe("63");
  });

  it("reports zero token usage and no recovery (it is a control, not a subject)", async () => {
    const attempt = oraclePolicy.begin(taskInput("update-account-nickname"));
    const step = await attempt.next(observation());
    expect(step.inputTokens).toBe(0);
    expect(step.outputTokens).toBe(0);
    expect(step.recovered).toBe(false);
  });
});

describe("noop control policy", () => {
  it("finishes immediately without taking any action", async () => {
    const attempt = noopPolicy.begin(taskInput("open-product-from-catalog"));
    const step = await attempt.next(observation());
    expect(step.command.kind).toBe("finish");
  });
});
