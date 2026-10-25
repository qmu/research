import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { adoptionTargetRuns, engines, metrics } from "./domain/result.js";
import { parseConfig, runLocalInference } from "./run.js";
import { observeStream } from "./vendors/stream.js";

const directories: string[] = [];
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function destination() {
  const dir = await mkdtemp(join(tmpdir(), "local-inference-"));
  directories.push(dir);
  return join(dir, "result.json");
}
function config(baseUrl: string) {
  return {
    messages: [{ role: "user", content: "Say hello" }],
    targets: engines.map((engine) => ({
      engine,
      baseUrl,
      model: "test-model",
      runtimeVersion: "test-only",
      condition: { quantization: "test-only" },
    })),
  };
}
function sse(chunks: unknown[]) {
  return (
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\r\n\r\n`).join("") +
    "data: [DONE]\r\n\r\n"
  );
}
const content = (text: string) => ({ choices: [{ delta: { content: text } }] });

describe("local inference common JSON", () => {
  it("posts identical requests for four engines and persists measured and missing fields", async () => {
    const requests: unknown[] = [];
    const server = createServer(async (req, res) => {
      expect(req.url).toBe("/v1/chat/completions");
      let body = "";
      for await (const chunk of req) body += chunk;
      requests.push(JSON.parse(body));
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(sse([content("hello")]).replace("data: [DONE]\r\n\r\n", ""));
      setTimeout(
        () =>
          res.end(
            sse([content(" world"), { usage: { completion_tokens: 2 } }]),
          ),
        10,
      );
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("listen failed");
    const output = await destination();
    const result = await runLocalInference(
      config(`http://127.0.0.1:${address.port}/v1`),
      output,
    );
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
    expect(result.runs.map((r) => r.engine)).toEqual([...engines, "strata"]);
    expect(result.runs.map((r) => r.purpose)).toEqual([
      "adoption-target",
      "adoption-target",
      "adoption-target",
      "warmup",
      "adoption-target",
    ]);
    expect(new Set(result.runs.map((r) => r.runId)).size).toBe(5);
    expect(requests).toHaveLength(5);
    for (const request of requests) expect(request).toEqual(requests[0]);
    for (const run of result.runs) {
      expect(run.runId).toMatch(/^[a-f0-9-]{36}$/);
      expect(run.ttft).toEqual({
        ...run.metrics.ttft,
        reason: "FIRST-CONTENT",
      });
      expect(run.ttft.value).toBeGreaterThanOrEqual(0);
      expect(run.quality).toEqual({ value: null, reason: "NOT-RUN" });
      expect(run.status).toBe("measured");
      expect(run.metrics.completion_tokens.value).toBe(2);
      expect(run.metrics.tps.value).toBeGreaterThan(0);
      expect(run.metrics.startup_time).toMatchObject({
        value: null,
        reason: "NOT-RUN",
      });
    }
    expect(await readFile(output, "utf8")).not.toContain("127.0.0.1");
    const replacement = await runLocalInference(
      config(`http://127.0.0.1:${address.port}/v1`),
      output,
    );
    expect(replacement.execution.version).toBe(2);
    expect(replacement.execution.runId).not.toBe(result.execution.runId);
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(replacement);
  });

  it("separates Strata's warm-up run from its adoption-target run so the warm-up's speed never reaches adoption", async () => {
    let calls = 0;
    const server = createServer(async (_req, res) => {
      calls++;
      // The 4th request is Strata's warm-up: give it an outlandish token
      // count no adoption-target reader should ever see.
      const tokens = calls === 4 ? 999 : 2;
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(
        sse([content("hello world"), { usage: { completion_tokens: tokens } }]),
      );
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("listen failed");
    const output = await destination();
    const result = await runLocalInference(
      config(`http://127.0.0.1:${address.port}/v1`),
      output,
    );
    expect(calls).toBe(5);
    const strataRuns = result.runs.filter((r) => r.engine === "strata");
    expect(strataRuns.map((r) => r.purpose)).toEqual([
      "warmup",
      "adoption-target",
    ]);
    expect(strataRuns[0].metrics.completion_tokens.value).toBe(999);
    expect(strataRuns[1].metrics.completion_tokens.value).toBe(2);
    // The manifest-level selector every adoption/speed/quality/memory reader
    // must use: exactly one row per engine, and Strata's is the measured
    // request, never the warm-up.
    const adoptionRuns = adoptionTargetRuns(result.runs);
    expect(adoptionRuns.map((r) => r.engine)).toEqual(engines);
    expect(
      adoptionRuns.find((r) => r.engine === "strata")?.metrics.completion_tokens
        .value,
    ).toBe(2);
  });

  it("saves failures without response bodies or URLs and continues to later engines", async () => {
    let calls = 0;
    const server = createServer((_req, res) => {
      calls++;
      if (calls === 1) {
        res.writeHead(500);
        res.end("secret-test-marker");
      } else if (calls === 2) {
        res.end(
          sse([content("partial")]).replace("data: [DONE]\r\n\r\n", "") +
            "data: {broken}\n\n",
        );
      } else if (calls === 3) {
        res.end(sse([content("ok")]));
      }
      // Strata's warm-up (4th) and adoption-target (5th) requests both hang:
      // the timeout must end each and preserve the other engines' rows.
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("listen failed");
    const output = await destination();
    const result = await runLocalInference(
      config(`http://127.0.0.1:${address.port}/v1`),
      output,
      200,
    );
    expect(result.runs.map((r) => r.status)).toEqual([
      "failed",
      "failed",
      "measured",
      "failed",
      "failed",
    ]);
    expect(result.runs.map((r) => r.ttft.reason)).toEqual([
      "HTTP-ERROR",
      "INVALID-STREAM",
      "FIRST-CONTENT",
      "TIMEOUT",
      "TIMEOUT",
    ]);
    expect(result.runs.map((r) => r.purpose)).toEqual([
      "adoption-target",
      "adoption-target",
      "adoption-target",
      "warmup",
      "adoption-target",
    ]);
    for (const run of result.runs.filter((r) => r.status === "failed")) {
      expect(run.ttft).toEqual({
        value: null,
        unit: "s",
        reason: run.ttft.reason,
      });
    }
    expect(result.runs[0].metrics.ttft).toMatchObject({
      value: null,
      reason: "MEASURE-FAILED",
    });
    expect(result.runs[2].metrics.tps).toMatchObject({
      value: null,
      reason: "NO-FIELD",
    });
    expect(await readFile(output, "utf8")).not.toContain("secret-test-marker");
  });

  it("parses fragmented UTF-8 and ignores role and usage frames for client timing", async () => {
    const bytes = new TextEncoder().encode(
      sse([
        { choices: [{ delta: { role: "assistant" } }] },
        content("日"),
        content("本"),
        { usage: { completion_tokens: 4 } },
      ]),
    );
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
          controller.close();
        },
      }),
    );
    let clock = 100;
    const observed = await observeStream(response, 100, () => (clock += 100));
    expect(observed).toEqual({
      firstMs: 100,
      lastMs: 200,
      completionTokens: 4,
    });
    expect(metrics(observed).ttft).toEqual({
      value: 0.1,
      unit: "s",
      source: "client",
    });
    expect(metrics(observed).tps.value).toBe(40);
  });

  it("rejects truncated streams and treats absent or invalid counts as gaps", async () => {
    await expect(
      observeStream(new Response('data: {"choices":[]}\n\n'), 0),
    ).rejects.toThrow("INCOMPLETE-STREAM");
    for (const count of [-1, 1.5, "4", null]) {
      const observed = await observeStream(
        new Response(
          sse([content("one"), { usage: { completion_tokens: count } }]),
        ),
        0,
      );
      expect(metrics(observed).completion_tokens.value).toBeNull();
      expect(metrics(observed).tps.value).toBeNull();
    }
    expect(
      metrics({ firstMs: 0, lastMs: 0, completionTokens: 1 }).tps.value,
    ).toBeNull();
  });

  it("persists NO-CONTENT for successful streams without text and assigns fresh run IDs", async () => {
    const server = createServer((_req, res) => {
      res.end(
        sse([
          { choices: [{ delta: { role: "assistant", content: "" } }] },
          { usage: { completion_tokens: 0 } },
        ]),
      );
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("listen failed");
    const input = config(`http://127.0.0.1:${address.port}/v1`);
    const ids = new Set<string>();
    for (let trial = 0; trial < 2; trial++) {
      const output = await destination();
      const result = await runLocalInference(input, output);
      for (const run of result.runs) {
        expect(run.status).toBe("measured");
        expect(run.ttft).toEqual({
          value: null,
          unit: "s",
          reason: "NO-CONTENT",
        });
        expect(ids.has(run.runId)).toBe(false);
        ids.add(run.runId);
      }
      expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
    }
  });

  it.each([
    ["null", "INVALID-STREAM"],
    ["[]", "INVALID-STREAM"],
    ['{"error":{"message":"secret-test-marker"}}', "STREAM-ERROR"],
  ])("persists safe TTFT reason for payload %s", async (payload, reason) => {
    const server = createServer((_req, res) => {
      res.end(
        `data: ${JSON.stringify(content("partial"))}\n\ndata: ${payload}\n\ndata: [DONE]\n\n`,
      );
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("listen failed");
    const output = await destination();
    const result = await runLocalInference(
      config(`http://127.0.0.1:${address.port}/v1`),
      output,
    );
    for (const run of result.runs) {
      expect(run.ttft).toEqual({ value: null, unit: "s", reason });
      expect(run.metrics.ttft.value).toBeNull();
      expect(run.status).toBe("failed");
    }
    const saved = await readFile(output, "utf8");
    expect(JSON.parse(saved)).toEqual(result);
    expect(saved).not.toContain("secret-test-marker");
  });

  it.each([
    ["NO-BODY", 204, ""],
    [
      "INCOMPLETE-STREAM",
      200,
      sse([content("partial")]).replace("data: [DONE]\r\n\r\n", ""),
    ],
    ["TIMEOUT", 200, null],
  ])("persists %s without partial timing", async (reason, status, body) => {
    const server = createServer((_req, res) => {
      res.writeHead(status);
      if (body === null) {
        res.write(`data: ${JSON.stringify(content("partial"))}\n\n`);
      } else {
        res.end(body);
      }
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("listen failed");
    const output = await destination();
    const result = await runLocalInference(
      config(`http://127.0.0.1:${address.port}/v1`),
      output,
      200,
    );
    for (const run of result.runs) {
      expect(run.ttft).toEqual({ value: null, unit: "s", reason });
      expect(run.metrics.ttft.value).toBeNull();
      expect(run.status).toBe("failed");
    }
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
  });

  it("persists split JSON log lines and discards timing on truncated logs", async () => {
    let calls = 0;
    const server = createServer((_req, res) => {
      const complete = ++calls % 2 === 1;
      res.writeHead(200, { "Content-Type": "application/x-ndjson" });
      const line = JSON.stringify(content("hello"));
      res.write(line.slice(0, 10));
      setTimeout(
        () => res.end(line.slice(10) + "\n" + (complete ? "[DONE]" : "")),
        10,
      );
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("listen failed");
    const output = await destination();
    const result = await runLocalInference(
      config(`http://127.0.0.1:${address.port}/v1`),
      output,
    );
    expect(result.runs.map((run) => run.ttft.reason)).toEqual([
      "FIRST-CONTENT",
      "INCOMPLETE-STREAM",
      "FIRST-CONTENT",
      "INCOMPLETE-STREAM",
      "FIRST-CONTENT",
    ]);
    for (const run of result.runs.filter((run) => run.status === "failed")) {
      expect(run.ttft.value).toBeNull();
      expect(run.metrics.ttft.value).toBeNull();
    }
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
  });

  it("validates engine identity, conditions and URL credentials before requests", () => {
    const valid = config("http://localhost:8000/v1");
    expect(parseConfig(valid)).toEqual(valid);
    expect(() =>
      parseConfig({ ...valid, targets: [valid.targets[0]] }),
    ).toThrow();
    expect(() =>
      parseConfig({ ...valid, targets: Array(4).fill(valid.targets[0]) }),
    ).toThrow();
    for (const url of [
      "ftp://localhost/v1",
      "http://user:secret@localhost/v1",
      "http://localhost/v1?key=secret",
    ])
      expect(() => parseConfig(config(url))).toThrow();
    expect(() => parseConfig({ ...valid, messages: [] })).toThrow();
  });
});

describe("saved RSS evidence", () => {
  it("saves per-target RSS even on HTTP failure and keeps the tier input separate", async () => {
    const output = await destination();
    let calls = 0;
    const result = await runLocalInference(
      config("http://127.0.0.1:1/v1"),
      output,
      100,
      () => ({
        stop: async () => ({
          value: ++calls,
          unit: "MiB",
          source: "ps-rss-sampled",
          scope: "single-server-process",
          reason: "SAMPLED",
          samples: 1,
          intervalMs: 50,
        }),
      }),
    );
    expect(result.runs.map((r) => r.peakMemory.value)).toEqual([1, 2, 3, 4, 5]);
    expect(result.runs.every((r) => r.status === "failed")).toBe(true);
    expect(result.runs.every((r) => r.ttft.reason === "REQUEST-FAILED")).toBe(
      true,
    );
    expect(result.runs[0].metrics.peak_rss).toEqual({
      value: 1,
      unit: "MiB",
      source: "os-sampler",
    });
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
  });
  it.each([0, -1, 1.5, NaN, Infinity])(
    "rejects invalid memory PID %s",
    (pid) => {
      const input = config("http://localhost/v1");
      expect(() =>
        parseConfig({
          ...input,
          targets: input.targets.map((t) => ({ ...t, memoryPid: pid })),
        }),
      ).toThrow("memoryPid");
    },
  );
  it("rejects remote PID attribution", () => {
    const input = config("https://example.com/v1");
    expect(() =>
      parseConfig({
        ...input,
        targets: input.targets.map((t) => ({ ...t, memoryPid: 42 })),
      }),
    ).toThrow("loopback");
  });
});
