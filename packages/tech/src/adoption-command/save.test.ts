import { mkdtemp, readFile, rm, access, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { saveAdoptionCommandRow, readAdoptionCommand } from "./save";
import { REPRODUCTION_COMMAND_ID } from "./domain/row";
const directories: string[] = [];
const pathForTest = async () => {
  const directory = await mkdtemp(join(tmpdir(), "adoption-command-"));
  directories.push(directory);
  return join(directory, "row.json");
};
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
const row = {
  id: "run-1",
  verdict: "rejected",
  commandId: REPRODUCTION_COMMAND_ID,
  engineVersion: "ollama-1",
  model: "qwen:7b",
  fixtureVersion: "v1",
  runnerVersion: "v1",
};
it("saves an ID-only row and resolves its command after reading", async () => {
  const path = await pathForTest();
  await saveAdoptionCommandRow({ ...row, command: "untrusted-body" }, path);
  expect(await readAdoptionCommand(path)).toBe(
    "npm run local-inference -- --engine-version 'ollama-1' --model 'qwen:7b' --fixture-version 'v1' --runner-version 'v1'",
  );
  const saved = await readFile(path, "utf8");
  expect(saved).toContain(REPRODUCTION_COMMAND_ID);
  expect(saved).not.toContain("npm run");
  expect(saved).not.toContain("untrusted-body");
  await expect(
    saveAdoptionCommandRow({ ...row, model: "other" }, path),
  ).rejects.toThrow();
  expect(await readFile(path, "utf8")).toBe(saved);
});
it("does not create a file for an unsupported template", async () => {
  const path = await pathForTest();
  await expect(
    saveAdoptionCommandRow({ ...row, commandId: "unknown" }, path),
  ).rejects.toThrow("unknown-reproduction-command-id");
  await expect(access(path)).rejects.toThrow();
});
it("refuses tampered saved references on generation", async () => {
  const path = await pathForTest();
  await writeFile(
    path,
    JSON.stringify({ ...row, commandId: "unknown", command: "echo injected" }),
  );
  await expect(readAdoptionCommand(path)).rejects.toThrow(
    "unknown-reproduction-command-id",
  );
});
