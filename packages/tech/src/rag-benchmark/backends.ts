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
  {
    id: "openai-vector-store",
    name: "OpenAI vector store (File Search)",
    kind: "managed",
    embeddingCoupling: "managed",
    isolatedStore: false,
    source: "https://platform.openai.com/docs/guides/retrieval",
    costNote:
      "Storage $0.10/GB/day after the first free GB; search calls $2.50 per 1k (platform.openai.com/pricing, 2026-07).",
    metadataFiltering: true,
    searchCostPer1kCallsUsd: 2.5,
    ingestionNote:
      "File Search chunks documents server-side (default 800-token chunks, 400-token overlap) and embeds them internally; the indexed unit is OpenAI's chunk, not the committed document.",
  },
];
