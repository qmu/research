import { describe, expect, it } from "vitest";
import { evaluatePredicate, type PageState } from "./predicate";
import { TASK_SUITE } from "./manifest";
import type { SuccessPredicate } from "./types";

const page = (over: Partial<PageState> = {}): PageState => ({
  url: "https://site/catalog.html",
  text: "Catalog page",
  inputValues: {},
  elementCounts: {},
  ...over,
});

describe("evaluatePredicate — url-ends-with", () => {
  const predicate: SuccessPredicate = {
    kind: "url-ends-with",
    detail: "/product/widget.html",
  };

  it("passes when the final URL ends with the target path", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        url: "https://site/product/widget.html",
      }),
    ).toBe(true);
  });

  it("fails on a different page", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        url: "https://site/product/notebook.html",
      }),
    ).toBe(false);
  });

  it("does not match when the target is only a prefix of the tail", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        url: "https://site/product/widget.html?ref=x",
      }),
    ).toBe(false);
  });
});

describe("evaluatePredicate — text-present", () => {
  const predicate: SuccessPredicate = {
    kind: "text-present",
    detail: "Thank you, your message was sent",
  };

  it("passes when the confirmation text is on the page", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        text: "Contact — Thank you, your message was sent. We will reply.",
      }),
    ).toBe(true);
  });

  it("fails when the text is absent", () => {
    expect(evaluatePredicate(predicate, page())).toBe(false);
  });
});

describe("evaluatePredicate — input-value", () => {
  const predicate: SuccessPredicate = {
    kind: "input-value",
    detail: "#nickname=researcher",
  };

  it("passes on an exact field value", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        inputValues: { "#nickname": "researcher" },
      }),
    ).toBe(true);
  });

  it("fails on a different value, and on an unobserved selector", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        inputValues: { "#nickname": "someone-else" },
      }),
    ).toBe(false);
    expect(evaluatePredicate(predicate, page())).toBe(false);
  });

  it("splits on the last '=' so a value never eats the selector", () => {
    expect(
      evaluatePredicate(
        { kind: "input-value", detail: "input[name=code]=SAVE10" },
        { ...page(), inputValues: { "input[name=code]": "SAVE10" } },
      ),
    ).toBe(true);
  });
});

describe("evaluatePredicate — element-count", () => {
  const predicate: SuccessPredicate = {
    kind: "element-count",
    detail: "#cart-items li=2",
  };

  it("passes on the exact count", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        elementCounts: { "#cart-items li": 2 },
      }),
    ).toBe(true);
  });

  it("fails when the count differs (one item added, or three)", () => {
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        elementCounts: { "#cart-items li": 1 },
      }),
    ).toBe(false);
    expect(
      evaluatePredicate(predicate, {
        ...page(),
        elementCounts: { "#cart-items li": 3 },
      }),
    ).toBe(false);
  });

  it("fails on a non-integer expected count", () => {
    expect(
      evaluatePredicate(
        { kind: "element-count", detail: "#cart-items li=two" },
        { ...page(), elementCounts: { "#cart-items li": 2 } },
      ),
    ).toBe(false);
  });
});

describe("evaluatePredicate — malformed details never credit an attempt", () => {
  it("fails a selector=value kind with no separator", () => {
    expect(
      evaluatePredicate(
        { kind: "input-value", detail: "#nickname" },
        { ...page(), inputValues: { "#nickname": "researcher" } },
      ),
    ).toBe(false);
  });

  it("fails when the value side is empty", () => {
    expect(
      evaluatePredicate(
        { kind: "element-count", detail: "#cart-items li=" },
        { ...page(), elementCounts: { "#cart-items li": 2 } },
      ),
    ).toBe(false);
  });
});

describe("task suite predicates are all evaluable", () => {
  it("declares only kinds the evaluator implements", () => {
    const supported = new Set([
      "url-ends-with",
      "text-present",
      "input-value",
      "element-count",
    ]);
    for (const task of TASK_SUITE.tasks) {
      expect(supported.has(task.successPredicate.kind), task.id).toBe(true);
    }
  });

  it("gives every selector=value predicate a parsable detail", () => {
    for (const task of TASK_SUITE.tasks) {
      const { kind, detail } = task.successPredicate;
      if (kind !== "input-value" && kind !== "element-count") continue;
      const index = detail.lastIndexOf("=");
      expect(index > 0 && index < detail.length - 1, task.id).toBe(true);
    }
  });
});
