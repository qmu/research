import { mkdtemp, open, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/** Publish only complete, synced JSON. Concurrent writers use last-rename-wins. */
export async function writeJsonAtomic(output: string, value: unknown) {
  const json = JSON.stringify(value, null, 2) + "\n";
  // Same directory/filesystem as the destination so rename is atomic.
  const temporary = await mkdtemp(
    join(dirname(output), `.${basename(output)}-`),
  );
  const path = join(temporary, "result.json");
  try {
    const file = await open(path, "wx", 0o600);
    try {
      await file.writeFile(json, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(path, output);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
