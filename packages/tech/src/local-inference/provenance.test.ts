import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { engines } from "./domain/result.js";
import { runLocalInference, runnerVersion } from "./run.js";
import * as provenance from "./vendors/provenance.js";

vi.mock("./vendors/provenance.js", () => ({ readTargetCommit: vi.fn() }));
vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof fs>()),
  rename: vi.fn((...args: Parameters<typeof fs.rename>) =>
    actual.rename(...args),
  ),
}));
const actual = await vi.importActual<typeof fs>("node:fs/promises");
const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.mocked(provenance.readTargetCommit).mockReset();
  vi.mocked(fs.rename)
    .mockReset()
    .mockImplementation((...args) => actual.rename(...args));
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => actual.rm(dir, { recursive: true, force: true })),
  );
});
const input = {
  messages: [{ role: "user", content: "hello" }],
  targets: engines.map((engine) => ({
    engine,
    baseUrl: "http://localhost/v1",
    model: "fixture",
    runtimeVersion: "engine-test",
    condition: {},
  })),
};
async function destination() {
  const dir = await actual.mkdtemp(join(tmpdir(), "runner-provenance-"));
  directories.push(dir);
  const output = join(dir, "result.json");
  await actual.writeFile(output, '{"previous":true}\n');
  return { dir, output };
}
it.each(["success", "http", "truncated", "empty", "invalid"] as const)(
  "publishes one captured commit and runner version with all measurement rows (stream=%s)",
  async (mode) => {
    const { output } = await destination();
    const sha = "a".repeat(40);
    vi.mocked(provenance.readTargetCommit)
      .mockReturnValueOnce(sha)
      .mockReturnValue("b".repeat(40));
    const fetch = vi.fn(async () => {
      expect(provenance.readTargetCommit).toHaveBeenCalledTimes(1);
      if (mode === "http")
        return new Response("private-marker", { status: 503 });
      const line = JSON.stringify({ choices: [{ delta: { content: "ok" } }] });
      const bytes = new TextEncoder().encode(
        mode === "empty"
          ? "[DONE]\n"
          : line +
              "\n" +
              (mode === "truncated"
                ? ""
                : mode === "invalid"
                  ? "{broken}\n[DONE]\n"
                  : "[DONE]\n"),
      );
      return new Response(
        new ReadableStream({
          start(controller) {
            for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "application/x-ndjson" } },
      );
    });
    vi.stubGlobal("fetch", fetch);
    let published = 0;
    vi.mocked(fs.rename).mockImplementation(async (source, target) => {
      if (target === output) {
        published++;
        expect(await actual.readFile(output, "utf8")).toBe(
          '{"previous":true}\n',
        );
        const pending = JSON.parse(await actual.readFile(source, "utf8"));
        expect(pending.execution).toEqual({
          targetCommit: sha,
          runnerVersion,
          commandSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          runId: expect.any(String),
          version: 1,
        });
        expect(pending.runs.map((r: { status: string }) => r.status)).toEqual(
          Array(5).fill(
            ["http", "truncated", "invalid"].includes(mode)
              ? "failed"
              : "measured",
          ),
        );
        expect(
          new Set(pending.runs.map((r: { runId: string }) => r.runId)).size,
        ).toBe(5);
        expect(pending.runs.map((r: { purpose: string }) => r.purpose)).toEqual(
          [
            "adoption-target",
            "adoption-target",
            "adoption-target",
            "warmup",
            "adoption-target",
          ],
        );
        for (const row of pending.runs) {
          expect(row.runnerVersion).toBe(pending.execution.runnerVersion);
          expect(row.targetCommit).toBe(pending.execution.targetCommit);
          expect(row.ttft.reason).toBe(
            {
              success: "FIRST-CONTENT",
              http: "HTTP-ERROR",
              truncated: "INCOMPLETE-STREAM",
              empty: "NO-CONTENT",
              invalid: "INVALID-STREAM",
            }[mode],
          );
          expect(row.ttft.value).toBe(row.metrics.ttft.value);
          if (mode === "success")
            expect(row.ttft.value).toBeGreaterThanOrEqual(0);
          else expect(row.ttft.value).toBeNull();
        }
      }
      await actual.rename(source, target);
    });
    const result = await runLocalInference(input, output);
    expect(published).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(JSON.parse(await actual.readFile(output, "utf8"))).toEqual(result);
    expect(result.execution.targetCommit).toBe(sha);
    expect(await actual.readFile(output, "utf8")).not.toContain(
      "private-marker",
    );
  },
);
it("refuses to measure or reserve when the commit is unavailable and preserves old bytes", async () => {
  const { dir, output } = await destination();
  vi.mocked(provenance.readTargetCommit).mockImplementation(() => {
    throw new Error("Cannot determine target commit");
  });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(runLocalInference(input, output)).rejects.toThrow(
    "Cannot determine target commit",
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(await actual.readFile(output, "utf8")).toBe('{"previous":true}\n');
  expect(await actual.readdir(dir)).toEqual(["result.json"]);
});
it("keeps prior metrics and metadata together when publication fails", async () => {
  const { dir, output } = await destination();
  vi.mocked(provenance.readTargetCommit).mockReturnValue("a".repeat(40));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  vi.mocked(fs.rename).mockImplementation(async (source, target) => {
    if (target === output) throw new Error("publication failed");
    await actual.rename(source, target);
  });
  await expect(runLocalInference(input, output)).rejects.toThrow(
    "publication failed",
  );
  expect(await actual.readFile(output, "utf8")).toBe('{"previous":true}\n');
  expect(
    JSON.parse(await actual.readFile(output + ".execution.json", "utf8"))
      .completed,
  ).toBe(false);
  expect((await actual.readdir(dir)).sort()).toEqual([
    "result.json",
    "result.json.execution.json",
  ]);
});

it("rejects an older stream after a newer commit and TTFT result are published", async () => {
  const { output } = await destination();
  vi.mocked(provenance.readTargetCommit)
    .mockReturnValueOnce("a".repeat(40))
    .mockReturnValue("b".repeat(40));
  let release!: (response: Response) => void;
  let entered!: () => void;
  const waiting = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const response = () =>
    new Response(
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
    );
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(() => {
        entered();
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      })
      .mockImplementation(async () => response()),
  );
  const older = runLocalInference(input, output);
  const rejected = expect(older).rejects.toThrow("STALE-EXECUTION");
  await waiting;
  const newer = await runLocalInference(input, output);
  const bytes = await actual.readFile(output, "utf8");
  release(response());
  await rejected;
  expect(await actual.readFile(output, "utf8")).toBe(bytes);
  expect(JSON.parse(bytes)).toEqual(newer);
  expect(newer.execution.version).toBe(2);
  expect(
    newer.runs.every(
      (row) =>
        row.targetCommit === "b".repeat(40) &&
        row.ttft.reason === "FIRST-CONTENT",
    ),
  ).toBe(true);
});
