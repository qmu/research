import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { engines } from "./domain/result.js";

const exec = promisify(execFile);
it.each([false, true])(
  "CLI saves four rows and signals request failure=%s",
  async (fail) => {
    const dir = await mkdtemp(join(tmpdir(), "local-inference-cli-"));
    const server = createServer((_req, res) => {
      if (fail) {
        res.writeHead(503);
        res.end("private-response-marker");
      } else
        res.end(
          'data: {"choices":[{"delta":{"content":"ok"}}],"usage":{"completion_tokens":1}}\n\ndata: [DONE]\n\n',
        );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("listen failed");
      const config = join(dir, "config.json");
      const output = join(dir, "result.json");
      await writeFile(
        config,
        JSON.stringify({
          targetCommit: "1".repeat(40),
          messages: [{ role: "user", content: "hello" }],
          targets: engines.map((engine) => ({
            engine,
            baseUrl: `http://127.0.0.1:${address.port}/v1`,
            model: "test-model",
            runtimeVersion: "test-only",
            condition: {},
          })),
        }),
      );
      const args = [
        "--import",
        "tsx/esm",
        "src/entrypoints/run-local-inference.ts",
        config,
        output,
      ];
      if (fail)
        await expect(exec(process.execPath, args)).rejects.toMatchObject({
          code: 1,
        });
      else {
        const { stdout } = await exec(process.execPath, args);
        expect(JSON.parse(stdout).runs).toEqual(
          engines.map((engine) => ({ engine, status: "measured" })),
        );
      }
      const json = await readFile(output, "utf8");
      expect(JSON.parse(json).execution).toEqual({
        runnerVersion: "local-inference/4",
        targetCommit: "1".repeat(40),
      });
      expect(
        JSON.parse(json).runs.map((r: { status: string }) => r.status),
      ).toEqual(Array(4).fill(fail ? "failed" : "measured"));
      expect(json).not.toContain("private-response-marker");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  },
);

it.each([undefined, "HEAD", "A".repeat(40)])(
  "CLI rejects invalid targetCommit %s without requests or output",
  async (targetCommit) => {
    const dir = await mkdtemp(join(tmpdir(), "local-inference-cli-"));
    let requests = 0;
    const server = createServer((_req, res) => {
      requests++;
      res.end("data: [DONE]\n\n");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("listen failed");
      const config = join(dir, "config.json");
      const output = join(dir, "result.json");
      await writeFile(
        config,
        JSON.stringify({
          targetCommit,
          messages: [{ role: "user", content: "hello" }],
          targets: engines.map((engine) => ({
            engine,
            baseUrl: `http://127.0.0.1:${address.port}/v1`,
            model: "test-model",
            runtimeVersion: "test-only",
            condition: {},
          })),
        }),
      );
      await expect(
        exec(process.execPath, [
          "--import",
          "tsx/esm",
          "src/entrypoints/run-local-inference.ts",
          config,
          output,
        ]),
      ).rejects.toMatchObject({ code: 1 });
      expect(requests).toBe(0);
      await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
