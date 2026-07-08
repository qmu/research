import { pathToFileURL } from "node:url";

/**
 * True when the given module is the script node was started with. Topic
 * entrypoints keep their standalone `npm run <topic>` behavior behind this
 * guard while staying importable (without side effects) by the unified
 * `research <topic>` dispatcher.
 */
export const isDirectRun = (moduleUrl: string): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && moduleUrl === pathToFileURL(entry).href;
};
