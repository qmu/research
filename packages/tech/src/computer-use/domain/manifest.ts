import type { TaskSuiteManifest } from "./types";

/**
 * The versioned, self-contained browser-task suite. Each task runs against a
 * PINNED local fixture site (`siteBase`) — not a live public site — so a trial is
 * reproducible byte-for-byte and does not drift as third-party pages change. This
 * is the deliberate reproducibility trade recorded in the design proposal: public
 * suites (OSWorld 2.0, WebArena, WebVoyager) are the reference our metric
 * definitions follow, but a live-site or fragmented-variant suite is not itself
 * reproducible, so v1 pins its own small deterministic suite.
 *
 * Every task's success is decided by a mechanically checkable predicate against
 * the final DOM/URL — never an aesthetic or LLM judgement. Changing a task or the
 * site is a suite-version bump; history charts connect same-version points only.
 *
 * The committed HTML for `siteBase` is served by the Playwright harness on the
 * real path (the gated real-trial follow-up); the keyless fixture path scores a
 * canned trajectory and never launches a browser.
 */
export const TASK_SUITE: TaskSuiteManifest = {
  version: "1",
  siteBase: "computer-use-fixture-site@1",
  tasks: [
    {
      id: "open-product-from-catalog",
      category: "navigation",
      goal: "From the catalog page, open the product page for the item named “Widget”.",
      startPath: "/catalog.html",
      successPredicate: {
        kind: "url-ends-with",
        detail: "/product/widget.html",
      },
      optimalSteps: 2,
    },
    {
      id: "search-and-open-first-result",
      category: "search",
      goal: 'Search the site for "notebook" and open the first result.',
      startPath: "/index.html",
      successPredicate: {
        kind: "url-ends-with",
        detail: "/product/notebook.html",
      },
      optimalSteps: 4,
    },
    {
      id: "add-two-items-to-cart",
      category: "multi-step",
      goal: "Add both the “Widget” and the “Notebook” to the shopping cart, then open the cart.",
      startPath: "/catalog.html",
      successPredicate: {
        kind: "element-count",
        detail: "#cart-items li=2",
      },
      optimalSteps: 6,
    },
    {
      id: "submit-contact-form",
      category: "form",
      goal: 'On the contact page, enter the name "QMU", the email "test@example.com", and the message "hello", then submit.',
      startPath: "/contact.html",
      successPredicate: {
        kind: "text-present",
        detail: "Thank you, your message was sent",
      },
      optimalSteps: 5,
    },
    {
      id: "apply-discount-code",
      category: "form",
      goal: 'In the cart, apply the discount code "SAVE10" and confirm the total updated.',
      startPath: "/cart.html",
      successPredicate: {
        kind: "input-value",
        detail: "#applied-code=SAVE10",
      },
      optimalSteps: 3,
    },
    {
      id: "read-order-total",
      category: "extraction",
      goal: "Open the order-summary page and confirm the displayed order total is present.",
      startPath: "/order-summary.html",
      successPredicate: {
        kind: "text-present",
        detail: "Order total:",
      },
      optimalSteps: 2,
    },
    {
      id: "filter-catalog-by-category",
      category: "navigation",
      goal: 'On the catalog, filter to the "Stationery" category and open the filtered listing.',
      startPath: "/catalog.html",
      successPredicate: {
        kind: "url-ends-with",
        detail: "/catalog.html?category=stationery",
      },
      optimalSteps: 2,
    },
    {
      id: "update-account-nickname",
      category: "form",
      goal: 'On the account settings page, change the nickname field to "researcher" and save.',
      startPath: "/account.html",
      successPredicate: {
        kind: "input-value",
        detail: "#nickname=researcher",
      },
      optimalSteps: 3,
    },
  ],
};
