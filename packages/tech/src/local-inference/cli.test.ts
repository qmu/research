import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { runnerVersion } from "./run.js";
import { readTargetCommit } from "./vendors/provenance.js";
import { engines } from "./domain/result.js";

const exec = promisify(execFile);
it.each([false, true])(
  "CLI saves five rows (incl. Strata warm-up) and signals request failure=%s",
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
          [...engines, "strata"].map((engine) => ({
            engine,
            status: "measured",
          })),
        );
      }
      const json = await readFile(output, "utf8");
      expect(
        JSON.parse(json).runs.map((r: { status: string }) => r.status),
      ).toEqual(Array(5).fill(fail ? "failed" : "measured"));
      const saved = JSON.parse(json);
      expect(saved.execution).toMatchObject({
        runnerVersion,
        targetCommit: readTargetCommit(),
        runId: expect.any(String),
        version: 1,
      });
      expect(
        new Set(saved.runs.map((row: { runId: string }) => row.runId)).size,
      ).toBe(5);
      expect(saved.runs.map((row: { purpose: string }) => row.purpose)).toEqual(
        [
          "adoption-target",
          "adoption-target",
          "adoption-target",
          "warmup",
          "adoption-target",
        ],
      );
      for (const row of saved.runs) {
        expect(row.runnerVersion).toBe(saved.execution.runnerVersion);
        expect(row.targetCommit).toBe(saved.execution.targetCommit);
        expect(row.ttft.reason).toBe(fail ? "HTTP-ERROR" : "FIRST-CONTENT");
        expect(row.ttft.value).toBe(row.metrics.ttft.value);
      }
      expect(json).not.toContain("private-response-marker");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
