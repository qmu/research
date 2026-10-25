import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { engines, metrics } from "./domain/result.js";
import { beginExecution } from "./vendors/versioned-result.js";
import { captureCommit } from "./vendors/provenance.js";
import {
  commandFingerprint,
  runnerVersion,
  parseConfig,
  runLocalInference,
} from "./run.js";
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
      60_000,
      [
        "/usr/bin/node",
        "/checkout/run-local-inference.ts",
        "private-config.json",
        "private-output.json",
      ],
    );
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
    expect(result.execution).toMatchObject({
      commitSha: await captureCommit(),
      commandSha256: commandFingerprint([
        "node",
        "run-local-inference.ts",
        "other-config.json",
        "other-output.json",
      ]),
      runnerVersion,
    });
    expect(await readFile(output, "utf8")).not.toContain("private-");
    expect(result.schemaVersion).toBe(1);
    expect(result.runs.map((r) => r.engine)).toEqual(engines);
    expect(requests).toHaveLength(4);
    for (const request of requests) expect(request).toEqual(requests[0]);
    for (const run of result.runs) {
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
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(replacement);
  });

  it.each(["completed", "pending", "failed-response"])(
    "stops sending requests when superseded (%s)",
    async (scenario) => {
      function deferred() {
        let resolve!: () => void;
        const promise = new Promise<void>((done) => {
          resolve = done;
        });
        return { promise, resolve };
      }
      const firstRequest = deferred();
      const release = deferred();
      let calls = 0;
      const server = createServer(async (_req, res) => {
        if (++calls === 1) {
          firstRequest.resolve();
          await release.promise;
        }
        if (scenario === "failed-response") res.writeHead(500);
        res.end(sse([content("ok")]));
      });
      servers.push(server);
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("listen failed");
      const output = await destination();
      const input = config(`http://127.0.0.1:${address.port}/v1`);
      const old = runLocalInference(input, output);
      const rejected = expect(old).rejects.toThrow("STALE-EXECUTION");
      try {
        await firstRequest.promise;
        const pending = scenario === "pending";
        const newer = pending
          ? { execution: await beginExecution(output) }
          : await runLocalInference(input, output);
        expect(newer.execution.version).toBe(2);
        const bytes = pending ? undefined : await readFile(output, "utf8");
        const state = await readFile(output + ".execution.json", "utf8");
        release.resolve();
        await rejected;
        expect(calls).toBe(pending ? 1 : 5);
        expect(await readFile(output + ".execution.json", "utf8")).toBe(state);
        if (pending)
          await expect(readFile(output)).rejects.toMatchObject({
            code: "ENOENT",
          });
        else expect(await readFile(output, "utf8")).toBe(bytes);
      } finally {
        release.resolve();
        await rejected;
      }
    },
  );

  it("saves failures without response bodies or URLs and continues to later engines", async () => {
    let calls = 0;
    const server = createServer((_req, res) => {
      calls++;
      if (calls === 1) {
        res.writeHead(500);
        res.end("secret-test-marker");
      } else if (calls === 2) {
        res.end("data: {broken}\n\n");
      } else if (calls === 3) {
        res.end(sse([content("ok")]));
      }
      // Fourth request hangs: the timeout must end it and preserve other rows.
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
    ]);
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
    expect(metrics(observed).tps.value).toBe(40);
  });

  it("rejects truncated streams and treats absent or invalid counts as gaps", async () => {
    await expect(
      observeStream(new Response('data: {"choices":[]}\n\n'), 0),
    ).rejects.toThrow("incomplete");
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

describe("command fingerprint", () => {
  it("hashes normalized argv with a stable SHA-256 encoding", () => {
    expect(
      commandFingerprint([
        "/usr/bin/node",
        "/a/run-local-inference.ts",
        "config.json",
        "out.json",
      ]),
    ).toBe(
      createHash("sha256")
        .update(
          JSON.stringify([
            "node",
            "run-local-inference.ts",
            "[REDACTED]",
            "[REDACTED]",
          ]),
        )
        .digest("hex"),
    );
    expect(
      commandFingerprint([
        "C:\\bin\\nodejs",
        "C:\\repo\\run-local-inference.ts",
        "x",
        "y",
      ]),
    ).toBe(commandFingerprint(["node", "run-local-inference.ts", "a", "b"]));
  });

  it.each([
    ["--api-key=secret-a", "--api-key=secret-b"],
    ["TOKEN=secret-a", "TOKEN=secret-b"],
    ["Authorization: Bearer secret-a", "Authorization: Bearer secret-b"],
    [
      "https://user:secret-a@host/?token=a",
      "https://user:secret-b@host/?token=b",
    ],
    ["unrecognized-secret-a", "unrecognized-secret-b"],
  ])(
    "removes secret-bearing and unknown tokens before hashing (%#)",
    (a, b) => {
      expect(commandFingerprint(["node", a])).toBe(
        commandFingerprint(["node", b]),
      );
    },
  );

  it("preserves public syntax and argv boundaries", () => {
    expect(commandFingerprint(["node", "--import", "tsx/esm"])).not.toBe(
      commandFingerprint(["tsx", "--import", "tsx/esm"]),
    );
    expect(commandFingerprint(["node", "a b"])).not.toBe(
      commandFingerprint(["node", "a", "b"]),
    );
  });
});
