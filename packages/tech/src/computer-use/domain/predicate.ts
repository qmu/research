import type { SuccessPredicate } from "./types";

/**
 * The pure success-predicate evaluator: the seam between the browser harness and
 * the benchmark's verdict. The harness observes the page ONCE after the agent
 * loop ends and hands the domain this flat `PageState`; the domain alone decides
 * whether the task succeeded. Keeping the decision here (rather than inside an
 * adapter) is what makes success mechanically checkable, provider-independent,
 * and unit-testable without a browser — the same reason the image-generation
 * rubric is graded in the domain rather than by the judge adapter.
 */
export type PageState = Readonly<{
  /** The final URL, including any query string. */
  url: string;
  /** The page's visible text content. */
  text: string;
  /** Input/field values, keyed by the selector the harness read them from. */
  inputValues: Readonly<Record<string, string>>;
  /** Element counts, keyed by the selector the harness counted. */
  elementCounts: Readonly<Record<string, number>>;
}>;

/**
 * Split a `<selector>=<value>` detail on its LAST `=`, so a selector may contain
 * `=` (e.g. an attribute selector) while the value is whatever follows the final
 * separator. Returns undefined when there is no separator — a malformed detail
 * never throws and never silently passes; it evaluates to a failed predicate.
 */
const splitOnLastEquals = (
  detail: string,
): Readonly<{ selector: string; value: string }> | undefined => {
  const index = detail.lastIndexOf("=");
  if (index <= 0 || index === detail.length - 1) return undefined;
  return {
    selector: detail.slice(0, index).trim(),
    value: detail.slice(index + 1).trim(),
  };
};

/**
 * One check per predicate kind. Keyed by the union itself, so the type checker
 * demands a handler for every kind: adding a kind to `SuccessPredicate` fails to
 * compile until it is scored here. That is the exhaustiveness a `switch` with a
 * `default` would have silently swallowed.
 */
const CHECKS: Readonly<
  Record<SuccessPredicate["kind"], (detail: string, page: PageState) => boolean>
> = {
  "url-ends-with": (detail, page) => page.url.endsWith(detail),
  "text-present": (detail, page) => page.text.includes(detail),
  "input-value": (detail, page) => {
    const parsed = splitOnLastEquals(detail);
    if (parsed === undefined) return false;
    return page.inputValues[parsed.selector] === parsed.value;
  },
  "element-count": (detail, page) => {
    const parsed = splitOnLastEquals(detail);
    if (parsed === undefined) return false;
    const expected = Number(parsed.value);
    if (!Number.isInteger(expected)) return false;
    return page.elementCounts[parsed.selector] === expected;
  },
};

/**
 * Decide one task's outcome. Every kind is a deterministic check against the
 * observed page — no LLM judgement, no aesthetic score. A malformed detail or an
 * unobserved selector reads as FAILURE: an attempt is only ever credited on
 * positive evidence, so a broken predicate can never inflate a subject's success
 * rate.
 */
export const evaluatePredicate = (
  predicate: SuccessPredicate,
  page: PageState,
): boolean => CHECKS[predicate.kind](predicate.detail, page);
