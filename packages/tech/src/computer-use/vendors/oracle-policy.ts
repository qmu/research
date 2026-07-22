import { TASK_SUITE } from "../domain/manifest";
import type {
  AgentPolicy,
  ComputerUseTaskInput,
  HarnessCommand,
  HarnessObservation,
  PolicyAttempt,
  PolicyStep,
} from "../../vendors/llm/types";

/**
 * A deterministic, keyless SOLVER for the pinned task suite — the harness's
 * self-test brain. It plugs into the exact same `AgentPolicy` seam a real
 * provider does, so driving it through the Playwright harness proves the whole
 * observe→think→act loop end to end with NO model and NO spend: a real browser,
 * a real page, real actuation, real predicate evaluation.
 *
 * It is a scripted solver, not a model: each task is a fixed list of commands.
 * Two things keep it honest as a control:
 *   1. The extraction task (`confirm-order-total`) READS the total off the
 *      observed page text and types it back — so a passing run proves the
 *      harness actually feeds live observations into the policy, not that a
 *      constant happened to be right.
 *   2. The companion `noopPolicy` finishes immediately and must solve 0/8,
 *      demonstrating the suite discriminates (a do-nothing agent fails every
 *      task) — the same control the real-trial de-risking used.
 */

const digitsAfter = (text: string, label: string): string => {
  const match = text.match(new RegExp(`${label}\\s*\\$?(\\d+)`));
  return match?.[1] ?? "";
};

type ScriptStep = (observation: HarnessObservation) => HarnessCommand;

// One script per suite task. Selectors address the committed fixture DOM; the
// harness actuates them against the live page. Keeping the scripts here (not in
// the harness) is what lets the harness stay provider-neutral.
const ORACLE_SCRIPTS: Readonly<Record<string, ReadonlyArray<ScriptStep>>> = {
  "open-product-from-catalog": [
    () => ({ kind: "click", selector: 'a:text-is("Widget")' }),
  ],
  "search-and-open-first-result": [
    () => ({ kind: "type", selector: "#search-input", text: "notebook" }),
    () => ({ kind: "click", selector: "#search-submit" }),
    () => ({ kind: "click", selector: "#search-results a" }),
  ],
  "add-two-items-to-cart": [
    () => ({ kind: "click", selector: "#add-widget" }),
    () => ({ kind: "click", selector: "#add-notebook" }),
    () => ({ kind: "click", selector: 'nav a:text-is("Cart")' }),
  ],
  "submit-contact-form": [
    () => ({ kind: "type", selector: "#contact-name", text: "QMU" }),
    () => ({
      kind: "type",
      selector: "#contact-email",
      text: "test@example.com",
    }),
    () => ({ kind: "type", selector: "#contact-message", text: "hello" }),
    () => ({ kind: "click", selector: "#contact-submit" }),
  ],
  "apply-discount-code": [
    () => ({ kind: "type", selector: "#discount-code", text: "SAVE10" }),
    () => ({ kind: "click", selector: "#apply-discount" }),
  ],
  "confirm-order-total": [
    // The read step: extract the total from the OBSERVED page, not a constant.
    (observation) => ({
      kind: "type",
      selector: "#confirm-total",
      text: digitsAfter(observation.pageText, "Order total:"),
    }),
    () => ({ kind: "click", selector: "#confirm-submit" }),
  ],
  "filter-catalog-by-category": [
    () => ({
      kind: "select",
      selector: "#category-filter",
      text: "stationery",
    }),
    () => ({ kind: "click", selector: "#filter-submit" }),
  ],
  "update-account-nickname": [
    () => ({ kind: "type", selector: "#nickname", text: "researcher" }),
    () => ({ kind: "click", selector: "#account-save" }),
  ],
};

/** True when the oracle scripts a solve for every committed suite task — a
 * keyless guard so a new task cannot ship without a control that can solve it. */
export const oracleCoversEveryTask = (): boolean =>
  TASK_SUITE.tasks.every((task) => task.id in ORACLE_SCRIPTS);

const FINISH: HarnessCommand = { kind: "finish" };

/** The deterministic oracle solver. Not a model, so it reports zero token usage
 * and never marks a recovery — it is the harness's control, not a subject. */
export const oraclePolicy: AgentPolicy = {
  model: "oracle-fixture-solver",
  begin: (task: ComputerUseTaskInput): PolicyAttempt => {
    const script = ORACLE_SCRIPTS[task.id] ?? [];
    let cursor = 0;
    return {
      next: (observation: HarnessObservation): Promise<PolicyStep> => {
        const step = script[cursor];
        cursor += 1;
        const command = step ? step(observation) : FINISH;
        return Promise.resolve({
          command,
          inputTokens: 0,
          outputTokens: 0,
          recovered: false,
        });
      },
    };
  },
};

/** The do-nothing control: finishes before taking any action, so it must solve
 * 0/8 — the evidence that the suite's predicates are not satisfied for free. */
export const noopPolicy: AgentPolicy = {
  model: "noop-control",
  begin: (): PolicyAttempt => ({
    next: (): Promise<PolicyStep> =>
      Promise.resolve({
        command: FINISH,
        inputTokens: 0,
        outputTokens: 0,
        recovered: false,
      }),
  }),
};
