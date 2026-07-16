import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TASK_SUITE } from "./manifest";

/**
 * Guards over the committed fixture site — the pinned browser environment the
 * task suite runs against. These read the files from disk, so the manifest and
 * the site can never drift apart: a task whose start page or target page is not
 * committed would make the real trial unreproducible, and the harness would
 * report a failure that says nothing about the model.
 */

const sitePath = (path: string): string =>
  resolve(process.cwd(), "src/computer-use/domain/data/site", path);

const pageFor = (webPath: string): string =>
  sitePath(webPath.replace(/^\//, "").split("?")[0] ?? "");

/** Every committed .html page, recursively (the site is small and flat). */
const htmlPages = (dir = sitePath(".")): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) return htmlPages(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });

describe("committed fixture site", () => {
  it("commits the start page of every task", () => {
    for (const task of TASK_SUITE.tasks) {
      expect(existsSync(pageFor(task.startPath)), task.id).toBe(true);
    }
  });

  it("commits every page a url-ends-with predicate targets", () => {
    for (const task of TASK_SUITE.tasks) {
      if (task.successPredicate.kind !== "url-ends-with") continue;
      expect(existsSync(pageFor(task.successPredicate.detail)), task.id).toBe(
        true,
      );
    }
  });

  it("commits every selector an input-value or element-count predicate reads", () => {
    // A predicate is evaluated on the page the agent ENDS on, which need not be
    // the page it started from (add-two-items-to-cart starts on the catalog and
    // finishes on the cart). So the selector must exist somewhere in the site,
    // not specifically in the start page — otherwise the harness would observe
    // nothing and the task could never pass however well the model performed.
    const markup = htmlPages()
      .map((page) => readFileSync(page, "utf8"))
      .join("\n");
    const selectorOf = (detail: string): string =>
      detail.slice(0, detail.lastIndexOf("=")).trim();
    for (const task of TASK_SUITE.tasks) {
      const { kind, detail } = task.successPredicate;
      if (kind !== "input-value" && kind !== "element-count") continue;
      // Every such selector in this suite is an id (optionally with a descendant
      // element), so the id is the part that must appear in the markup.
      const id = (selectorOf(detail).match(/#([\w-]+)/)?.[1] ?? "").trim();
      expect(id.length, task.id).toBeGreaterThan(0);
      expect(markup.includes(`id="${id}"`), `${task.id} → #${id}`).toBe(true);
    }
  });

  it("reaches the network from no page (the site must stay self-contained)", () => {
    for (const page of htmlPages()) {
      const markup = readFileSync(page, "utf8");
      expect(/(src|href)\s*=\s*"https?:/i.test(markup), page).toBe(false);
    }
  });

  it("declares a siteBase the report and history can version on", () => {
    expect(TASK_SUITE.siteBase.length).toBeGreaterThan(0);
    expect(TASK_SUITE.version.length).toBeGreaterThan(0);
  });
});
