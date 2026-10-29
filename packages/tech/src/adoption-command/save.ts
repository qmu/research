import { readFile, writeFile } from "node:fs/promises";
import {
  parseAdoptionCommandRow,
  resolveAdoptionCommand,
  serializeAdoptionCommandRow,
} from "./domain/row";

/** Validate before creating a new file; never overwrite an existing adoption row. */
export const saveAdoptionCommandRow = async (
  input: unknown,
  path: string,
): Promise<void> => {
  const serialized = serializeAdoptionCommandRow(input);
  await writeFile(path, serialized, { flag: "wx" });
};

/** Generate display text only after validating the saved template reference. */
export const readAdoptionCommand = async (path: string): Promise<string> =>
  resolveAdoptionCommand(
    parseAdoptionCommandRow(JSON.parse(await readFile(path, "utf8"))),
  );
