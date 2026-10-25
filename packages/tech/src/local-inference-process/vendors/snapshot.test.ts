import { execFile } from "node:child_process";
import { beforeEach, expect, it, vi } from "vitest";
import { readProcessSnapshot, SNAPSHOT_TIMEOUT_MS } from "./process.js";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  execFile: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(execFile).mockReset();
});

function respond(error: object | null, stdout = "") {
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const callback = args.at(-1) as (
      error: object | null,
      stdout: string,
    ) => void;
    callback(error, stdout);
    return {} as ReturnType<typeof execFile>;
  });
}

it("bounds ps duration/output and requests only numeric identity/RSS fields", async () => {
  respond(null, "40 1 40 1536 S Sun Oct 25 12:00:00 2026\n");
  expect((await readProcessSnapshot()).rows?.[0].rssKiB).toBe(1536);
  expect(execFile).toHaveBeenCalledWith(
    "/bin/ps",
    ["-axo", "pid=,ppid=,pgid=,rss=,stat=,lstart="],
    expect.objectContaining({
      timeout: SNAPSHOT_TIMEOUT_MS,
      killSignal: "SIGKILL",
      maxBuffer: 4 * 1024 * 1024,
      env: expect.objectContaining({ LC_ALL: "C" }),
    }),
    expect.any(Function),
  );
});
it.each([
  [{ killed: true, code: null, message: "private diagnostic" }, "PS-TIMEOUT"],
  [{ killed: true, code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" }, "PS-FAILED"],
  [{ code: "ENOENT", message: "private diagnostic" }, "PS-FAILED"],
] as const)(
  "normalizes ps failures without diagnostics",
  async (error, reason) => {
    respond(error);
    expect(await readProcessSnapshot()).toEqual({ reason });
  },
);
it("rejects malformed ps output without including it in the reason", async () => {
  respond(null, "private malformed output");
  expect(await readProcessSnapshot()).toEqual({ reason: "INVALID-SAMPLE" });
});
