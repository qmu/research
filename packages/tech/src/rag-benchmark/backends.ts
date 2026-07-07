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
  {
    id: "s3-vectors",
    name: "AWS S3 Vectors",
    kind: "self-managed",
    embeddingCoupling: "fixed",
    isolatedStore: true,
    source:
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html",
    costNote:
      "Storage + PUT/query request pricing per AWS S3 Vectors (docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-pricing.html, 2026-07); this benchmark's volume is well under $0.01.",
    metadataFiltering: true,
    ingestionNote:
      "Stores the fixed-embedding vectors we provide (float32, cosine); a self-managed, store-isolated reading. Requires AWS credentials and a region where S3 Vectors is available (verified in ap-northeast-1); IAM: s3vectors:CreateVectorBucket/CreateIndex/PutVectors/QueryVectors/DeleteIndex/DeleteVectorBucket.",
  },
];
