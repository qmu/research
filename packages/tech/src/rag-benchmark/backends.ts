import type { Backend } from "./domain/types";

export const BACKENDS: ReadonlyArray<Backend> = [
  {
    id: "sqlite-vec",
    name: "sqlite-vec",
    kind: "self-managed",
    embeddingCoupling: "fixed",
    isolatedStore: true,
    source: "https://github.com/asg017/sqlite-vec",
    costNote: "Local SQLite extension; no API cost for benchmark queries.",
    metadataFiltering: false,
  },
];
