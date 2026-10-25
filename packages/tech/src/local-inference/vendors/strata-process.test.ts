import { describe, it, expect } from "vitest";
import { runStrataProcess } from "./strata-process";

// These spawn real Node subprocesses in place of the `strata` binary, so exit
// codes and the timeout kill path are exercised for real rather than mocked.

describe("runStrataProcess", () => {
  it("reports a clean exit", async () => {
    const outcome = await runStrataProcess({
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
      timeoutMs: 5000,
    });
    expect(outcome).toEqual({ kind: "exit", exitCode: 0 });
  });

  it("reports a nonzero exit code", async () => {
    const outcome = await runStrataProcess({
      command: process.execPath,
      args: ["-e", "process.exit(3)"],
      timeoutMs: 5000,
    });
    expect(outcome).toEqual({ kind: "exit", exitCode: 3 });
  });

  it("kills a process running past timeoutMs and reports timeout", async () => {
    const outcome = await runStrataProcess({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10000)"],
      timeoutMs: 150,
    });
    expect(outcome).toEqual({ kind: "timeout" });
  });

  it("reports exitCode -1 when the command cannot be spawned", async () => {
    const outcome = await runStrataProcess({
      command: "/no/such/strata-binary-for-testing",
      args: [],
      timeoutMs: 5000,
    });
    expect(outcome).toEqual({ kind: "exit", exitCode: -1 });
  });
});
