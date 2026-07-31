import { describe, expect, it } from "vitest";
import { openPlaywrightHarness } from "./playwright-harness";
import { noopPolicy, oraclePolicy } from "./oracle-policy";
import { TASK_SUITE } from "../domain/manifest";

/**
 * The harness self-test: it drives the REAL Playwright harness against the pinned
 * fixture site with two keyless controls and asserts the loop discriminates —
 * the deterministic oracle solves every task (8/8), a do-nothing agent solves
 * none (0/8). This is free local browser automation: no provider, no key, no
 * spend. It proves the observe→think→act loop, actuation, and predicate-decided
 * success end to end — the exact machinery a real (paid) trial then exercises
 * with a model in place of the oracle.
 *
 * It is env-gated (`COMPUTER_USE_BROWSER_TEST=1`) because it needs a chromium
 * binary, so the default keyless CI test run stays browser-free and byte-stable.
 * Run locally with:
 *   npx playwright install chromium
 *   COMPUTER_USE_BROWSER_TEST=1 npx vitest --run src/computer-use/vendors
 */

const RUN = process.env.COMPUTER_USE_BROWSER_TEST === "1";

const input = (id: string, startPath: string) => ({
  id,
  goal: "self-test",
  // The harness derives the real served URL from the manifest by task id; this
  // synthetic startUrl is ignored, mirroring how the runner constructs it.
  startUrl: `computer-use-fixture-site@1${startPath}`,
});

describe.skipIf(!RUN)("Playwright harness — real-browser self-test", () => {
  it("oracle solves every suite task; the noop control solves none", async () => {
    const oracle = await openPlaywrightHarness({
      policy: oraclePolicy,
      captureScreenshots: false,
    });
    try {
      for (const task of TASK_SUITE.tasks) {
        const attempt = await oracle.client.attemptTask(
          input(task.id, task.startPath),
        );
        expect(attempt.succeeded, `oracle ${task.id}`).toBe(true);
        expect(
          attempt.actions.length,
          `oracle ${task.id} acted`,
        ).toBeGreaterThan(0);
      }
    } finally {
      await oracle.close();
    }

    const noop = await openPlaywrightHarness({
      policy: noopPolicy,
      captureScreenshots: false,
    });
    try {
      for (const task of TASK_SUITE.tasks) {
        const attempt = await noop.client.attemptTask(
          input(task.id, task.startPath),
        );
        expect(attempt.succeeded, `noop ${task.id}`).toBe(false);
      }
    } finally {
      await noop.close();
    }
  }, 180_000);
});
