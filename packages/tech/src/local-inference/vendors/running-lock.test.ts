import { spawn } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { withRunningLock } from "./running-lock.js";

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true });
});
async function output() {
  const dir = await mkdtemp(join(tmpdir(), "running-lock-"));
  dirs.push(dir);
  return join(dir, "result.json");
}
it("rejects concurrent owners, including directory aliases, without invoking their work", async () => {
  const path = await output();
  await symlink(dirs[0], join(dirs[0], "alias"));
  await withRunningLock(path, async () => {
    await expect(
      withRunningLock(join(dirs[0], "alias/result.json"), async () => {
        throw new Error("must not run");
      }),
    ).rejects.toThrow("OUTPUT-RUNNING");
    await withRunningLock(await output(), async () => undefined);
  });
  await withRunningLock(path, async () => undefined);
});
it("reuses old lock files and releases ownership on exceptions", async () => {
  const path = await output();
  await writeFile(`${path}.running.lock`, "old lock file");
  await expect(
    withRunningLock(path, async () => {
      throw new Error("failure");
    }),
  ).rejects.toThrow("failure");
  await withRunningLock(path, async () => undefined);
});
it("recovers a killed owner without deleting the lock inode", async () => {
  const path = await output();
  const url = new URL("./running-lock.ts", import.meta.url).href;
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "--input-type=module",
      "-e",
      `import { withRunningLock } from ${JSON.stringify(url)}; await withRunningLock(process.argv[1], async () => { console.log('ready'); setInterval(() => {}, 1000); await new Promise(() => {}); });`,
      path,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  await new Promise<void>((resolve, reject) => {
    child.stdout.once("data", () => resolve());
    child.once("exit", () => reject(new Error("owner exited early")));
  });
  await expect(withRunningLock(path, async () => undefined)).rejects.toThrow(
    "OUTPUT-RUNNING",
  );
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGKILL");
  await exited;
  // Pipe closure releases the helper; allow it to observe EOF before retrying.
  await expect
    .poll(async () => {
      try {
        await withRunningLock(path, async () => undefined);
        return true;
      } catch {
        return false;
      }
    })
    .toBe(true);
});
