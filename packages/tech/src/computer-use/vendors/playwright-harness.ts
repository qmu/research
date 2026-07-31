import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, normalize } from "node:path";
import type { Browser, Page } from "playwright";
import { TASK_SUITE } from "../domain/manifest";
import { evaluatePredicate, type PageState } from "../domain/predicate";
import type { BrowserTask, SuccessPredicate } from "../domain/types";
import type {
  AgentPolicy,
  ComputerUseAction,
  ComputerUseClient,
  ComputerUseTaskInput,
  HarnessCommand,
  HarnessObservation,
  TaskAttempt,
} from "../../vendors/llm/types";

/**
 * The real, fixed Playwright harness — the single actuation + observation layer
 * every computer-use subject is driven through, so the only variable across
 * subjects is the model/tool (the `AgentPolicy`). It serves the committed fixture
 * site over a local origin (a real http:// origin, so the cart's `sessionStorage`
 * and query-string filters behave), drives an observe→think→act loop, and — after
 * the loop ends — reads the final page into a `PageState` and lets the DOMAIN
 * decide success (`evaluatePredicate`). The harness never judges: it observes.
 *
 * `playwright` is imported dynamically inside `open`, so the keyless fixture and
 * estimate paths never load it or need a browser binary. This module is only
 * reached on the real path (an owner-triggered trial) and by the env-gated
 * harness self-test (`COMPUTER_USE_BROWSER_TEST=1`), which drives it with the
 * keyless oracle policy — a real browser, no model, no spend.
 */

export type HarnessOptions = Readonly<{
  policy: AgentPolicy;
  /** Absolute path to the committed fixture site (defaults to the topic's site). */
  siteDir?: string;
  /** Upper bound on think→act steps per attempt (a stuck agent cannot loop forever). */
  maxSteps?: number;
  /** Launch a headless browser (default true). */
  headless?: boolean;
  viewport?: Readonly<{ width: number; height: number }>;
  /** Capture a screenshot each observation for coordinate-based tools (default true). */
  captureScreenshots?: boolean;
}>;

export type HarnessSession = Readonly<{
  client: ComputerUseClient;
  close: () => Promise<void>;
}>;

const DEFAULT_SITE_DIR = fileURLToPath(
  new URL("../domain/data/site", import.meta.url),
);
const DEFAULT_VIEWPORT = { width: 1280, height: 800 } as const;
const DEFAULT_MAX_STEPS = 30;
const MAX_PAGE_TEXT = 5_000;

const MIME: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const mimeFor = (filePath: string): string =>
  MIME[extname(filePath)] ?? "application/octet-stream";

/** A local static server for the committed site. A real origin is what lets the
 * `sessionStorage`-backed cart and the `?category=` filter behave as a browser
 * expects; `file://` would break both. Path traversal outside the site is 403. */
const startSiteServer = async (
  siteDir: string,
): Promise<Readonly<{ server: Server; baseUrl: string }>> => {
  const root = normalize(siteDir);
  const server = createServer((req, res) => {
    const rawPath = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    const rel = rawPath === "/" ? "/index.html" : rawPath;
    const filePath = normalize(join(root, rel));
    if (filePath !== root && !filePath.startsWith(root)) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    readFile(filePath)
      .then((buffer) => {
        res.setHeader("content-type", mimeFor(filePath));
        res.end(buffer);
      })
      .catch(() => {
        res.statusCode = 404;
        res.end("not found");
      });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

const taskById = (id: string): BrowserTask => {
  const task = TASK_SUITE.tasks.find((candidate) => candidate.id === id);
  if (task === undefined) {
    throw new Error(`unknown computer-use task id: ${id}`);
  }
  return task;
};

/** Best-effort wait for the page to settle after an actuation — navigations,
 * and the small client-side DOM updates the fixture uses (search render,
 * add-to-cart). Failures never throw the loop; a slow page just observes stale. */
const settle = async (page: Page): Promise<void> => {
  await page.waitForLoadState("load", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(50);
};

const selectorOf = (detail: string): string =>
  detail.slice(0, detail.lastIndexOf("=")).trim();

/**
 * Read exactly the final-page facts the task's predicate needs — no more — into
 * the flat `PageState` the domain evaluates. `url` and `text` are always read;
 * an `input-value`/`element-count` predicate additionally reads its one selector.
 * A missing element reads as absent (empty map), so a task is only ever credited
 * on positive evidence, never on an unobserved selector.
 */
const observeFinalState = async (
  page: Page,
  predicate: SuccessPredicate,
): Promise<PageState> => {
  const url = page.url();
  const text = await page
    .evaluate(() => document.body.innerText)
    .catch(() => "");
  const inputValues: Record<string, string> = {};
  const elementCounts: Record<string, number> = {};
  if (predicate.kind === "input-value") {
    const selector = selectorOf(predicate.detail);
    const value = await page.inputValue(selector).catch(() => undefined);
    if (value !== undefined) inputValues[selector] = value;
  }
  if (predicate.kind === "element-count") {
    const selector = selectorOf(predicate.detail);
    const count = await page
      .locator(selector)
      .count()
      .catch(() => undefined);
    if (count !== undefined) elementCounts[selector] = count;
  }
  return { url, text, inputValues, elementCounts };
};

const resolveNavigateUrl = (target: string, baseUrl: string): string => {
  if (/^https?:/i.test(target)) return target;
  return `${baseUrl}${target.startsWith("/") ? target : `/${target}`}`;
};

/** Actuate one normalized command against the live page. Selector-based commands
 * (the oracle) and coordinate-based commands (the provider computer-use tools)
 * are both supported. Throwing is caught by the loop and surfaced to the policy
 * as `lastError` (the recovery signal); it never crashes the attempt. */
const actuate = async (
  page: Page,
  command: HarnessCommand,
  baseUrl: string,
): Promise<void> => {
  const timeout = 5_000;
  if (command.kind === "navigate") {
    await page.goto(resolveNavigateUrl(command.text ?? "/", baseUrl));
    return;
  }
  if (command.kind === "click") {
    if (command.selector !== undefined) {
      await page.click(command.selector, { timeout });
    } else if (command.point !== undefined) {
      await page.mouse.click(command.point.x, command.point.y);
    }
    return;
  }
  if (command.kind === "type") {
    if (command.selector !== undefined) {
      await page.fill(command.selector, command.text ?? "", { timeout });
    } else {
      if (command.point !== undefined) {
        await page.mouse.click(command.point.x, command.point.y);
      }
      await page.keyboard.type(command.text ?? "");
    }
    return;
  }
  if (command.kind === "select") {
    if (command.selector !== undefined) {
      await page.selectOption(command.selector, command.text ?? "", {
        timeout,
      });
    }
    return;
  }
  if (command.kind === "key") {
    if (command.selector !== undefined) {
      await page.focus(command.selector, { timeout });
    }
    await page.keyboard.press(command.key ?? "Enter");
    return;
  }
  if (command.kind === "submit") {
    if (command.selector !== undefined) {
      await page.click(command.selector, { timeout });
    } else {
      await page.keyboard.press("Enter");
    }
    return;
  }
  if (command.kind === "scroll") {
    await page.mouse.wheel(0, 400);
    return;
  }
  if (command.kind === "wait") {
    await page.waitForTimeout(300);
  }
};

const targetOf = (command: HarnessCommand): string =>
  command.selector ??
  (command.point ? `(${command.point.x},${command.point.y})` : undefined) ??
  command.text ??
  command.key ??
  "";

const observe = async (
  page: Page,
  stepIndex: number,
  viewport: Readonly<{ width: number; height: number }>,
  captureScreenshots: boolean,
  lastError: string | undefined,
): Promise<HarnessObservation> => {
  const url = page.url();
  const pageText = (
    await page.evaluate(() => document.body.innerText).catch(() => "")
  ).slice(0, MAX_PAGE_TEXT);
  // A compact list of the page's interactive elements (id / name / type / label
  // / value) — the textual affordance map a model reasons over alongside the
  // screenshot. Cheaper and more actionable than a full accessibility tree, and
  // it does not depend on Playwright's removed `accessibility` API.
  const axSnapshot = (
    await page
      .evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll("a, button, input, select, textarea"),
        ).slice(0, 60);
        return nodes
          .map((node) => {
            const tag = node.tagName.toLowerCase();
            const id = node.id ? `#${node.id}` : "";
            const name = node.getAttribute("name");
            const type = node.getAttribute("type");
            const label = (node.textContent ?? "").trim().slice(0, 40);
            const value =
              "value" in node ? String((node as { value: unknown }).value) : "";
            return [
              `${tag}${id}`,
              name ? `name=${name}` : "",
              type ? `type=${type}` : "",
              label ? `"${label}"` : "",
              value ? `value=${value}` : "",
            ]
              .filter((part) => part !== "")
              .join(" ");
          })
          .join("\n");
      })
      .catch(() => "")
  ).slice(0, MAX_PAGE_TEXT);
  const screenshotBase64 = captureScreenshots
    ? (await page.screenshot().catch(() => undefined))?.toString("base64")
    : undefined;
  return {
    stepIndex,
    url,
    pageText,
    axSnapshot,
    viewport,
    ...(screenshotBase64 === undefined ? {} : { screenshotBase64 }),
    ...(lastError === undefined ? {} : { lastError }),
  };
};

/**
 * Open a harness session: start the site server, launch one browser, and return
 * a `ComputerUseClient` whose `attemptTask` drives one task to completion through
 * the given policy. Each attempt runs in a FRESH browser context so the
 * `sessionStorage` cart starts empty — that is what makes the "add two items"
 * task reproducible. `close` tears down the browser and the server.
 */
export const openPlaywrightHarness = async (
  options: HarnessOptions,
): Promise<HarnessSession> => {
  const siteDir = options.siteDir ?? DEFAULT_SITE_DIR;
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const viewport = options.viewport ?? DEFAULT_VIEWPORT;
  const captureScreenshots = options.captureScreenshots ?? true;
  const { server, baseUrl } = await startSiteServer(siteDir);
  const playwright = await import("playwright");
  const browser: Browser = await playwright.chromium.launch({
    headless: options.headless ?? true,
  });

  const attemptTask = async (
    input: ComputerUseTaskInput,
  ): Promise<TaskAttempt> => {
    const task = taskById(input.id);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const attempt = options.policy.begin(input);
    const actions: ComputerUseAction[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    let lastError: string | undefined;
    const startedAt = Date.now();
    try {
      await page.goto(`${baseUrl}${task.startPath}`);
      for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
        const observation = await observe(
          page,
          stepIndex,
          viewport,
          captureScreenshots,
          lastError,
        );
        const stepStartedAt = Date.now();
        const step = await attempt.next(observation);
        inputTokens += step.inputTokens;
        outputTokens += step.outputTokens;
        const command = step.command;
        if (command.kind === "finish") break;
        lastError = undefined;
        try {
          await actuate(page, command, baseUrl);
          await settle(page);
        } catch (error) {
          lastError = String(error);
        }
        actions.push({
          kind: command.kind,
          target: targetOf(command),
          latencyMs: Date.now() - stepStartedAt,
          recovered: step.recovered,
        });
      }
      const finalState = await observeFinalState(page, task.successPredicate);
      return {
        taskId: input.id,
        succeeded: evaluatePredicate(task.successPredicate, finalState),
        actions,
        wallClockMs: Date.now() - startedAt,
        inputTokens,
        outputTokens,
      };
    } finally {
      await context.close();
    }
  };

  return {
    client: { model: options.policy.model, attemptTask },
    close: async () => {
      await browser.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};
