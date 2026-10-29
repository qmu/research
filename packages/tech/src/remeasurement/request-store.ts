import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { remeasurementRequest } from "./domain/request.js";

const hasCode = (error: unknown, code: string) =>
  error !== null &&
  typeof error === "object" &&
  "code" in error &&
  error.code === code;

/** One shared filesystem directory is the uniqueness scope, including processes. */
export async function saveRemeasurementRequest(
  directory: string,
  input: unknown,
) {
  // Never create storage or trust a supplied key before validating the identity.
  const request = remeasurementRequest(input);
  const bytes = JSON.stringify(request) + "\n";
  await mkdir(directory, { recursive: true });
  const destination = join(directory, `${request.idempotencyKey}.json`);
  const temporary = join(directory, `.pending-${randomUUID()}`);
  const file = await open(temporary, "wx", 0o600);
  let created = false;
  try {
    try {
      await file.writeFile(bytes, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      // Publishing a fully written inode is atomic and refuses to overwrite.
      await link(temporary, destination);
      created = true;
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      // A corrupt or mismatched record must never be reported as a success.
      if ((await readFile(destination, "utf8")) !== bytes)
        throw new Error("REMEASUREMENT-STORE-CONFLICT");
    }
    const dir = await open(directory, "r");
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
    return { created, request };
  } finally {
    await unlink(temporary);
  }
}
