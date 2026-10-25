import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";
import { beginExecution } from "./vendors/versioned-result.js";

const exec = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "completion-notice-"));
  dirs.push(dir);
  const output = join(dir, "result.json");
  const notice = join(dir, "notice.json");
  await writeFile(output, '{"previous":true}\n');
  const execution = await beginExecution(output);
  const send = async (input: unknown) => {
    await writeFile(notice, JSON.stringify(input));
    return exec(process.execPath, [
      "--import",
      "tsx/esm",
      "src/entrypoints/complete-local-inference.ts",
      notice,
      output,
    ]);
  };
  return { output, execution, send };
}

it("publishes a current worker notice and rejects a duplicate without changing bytes", async () => {
  const { output, execution, send } = await setup();
  const notice = { execution, result: { schemaVersion: 1, runs: [] } };
  const { stdout } = await send(notice);
  expect(JSON.parse(stdout)).toEqual({ status: "saved", execution });
  const bytes = await readFile(output, "utf8");
  expect(JSON.parse(bytes)).toEqual({ ...notice.result, execution });
  await expect(send(notice)).rejects.toMatchObject({
    code: 1,
    stderr: '{"status":"failed","code":"STALE-EXECUTION"}\n',
  });
  expect(await readFile(output, "utf8")).toBe(bytes);
});

it.each(["id", "version", "both"])(
  "rejects a stale %s before saving, even while the current worker is pending",
  async (field) => {
    const { output, execution: old, send } = await setup();
    const current = await beginExecution(output);
    const execution = {
      runId: field === "version" ? current.runId : old.runId,
      version: field === "id" ? current.version : old.version,
    };
    const before = await readFile(output, "utf8");
    const state = await readFile(`${output}.execution.json`, "utf8");
    await expect(
      send({ execution, result: { privateMarker: "do-not-log" } }),
    ).rejects.toMatchObject({
      code: 1,
      stdout: "",
      stderr: '{"status":"failed","code":"STALE-EXECUTION"}\n',
    });
    expect(await readFile(output, "utf8")).toBe(before);
    expect(await readFile(`${output}.execution.json`, "utf8")).toBe(state);
    await send({ execution: current, result: { ok: true } });
  },
);

it.each([
  null,
  { runId: "x", version: 0 },
  { runId: "x", version: 1.5 },
  { runId: "", version: 1 },
])(
  "rejects malformed identity %j with a fixed failure code",
  async (execution) => {
    const { output, send } = await setup();
    await expect(send({ execution, result: {} })).rejects.toMatchObject({
      code: 1,
      stderr: '{"status":"failed","code":"COMPLETION-FAILED"}\n',
    });
    expect(await readFile(output, "utf8")).toBe('{"previous":true}\n');
  },
);

it("does not accept a second identity inside the result", async () => {
  const { output, execution, send } = await setup();
  await expect(
    send({
      execution,
      result: { execution: { runId: "other", version: 999 } },
    }),
  ).rejects.toMatchObject({
    code: 1,
    stderr: '{"status":"failed","code":"COMPLETION-FAILED"}\n',
  });
  expect(await readFile(output, "utf8")).toBe('{"previous":true}\n');
});
