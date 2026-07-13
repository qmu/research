import type { Backend } from "./domain/types";

export const BACKENDS: ReadonlyArray<Backend> = [
  {
    id: "sqlite-vec",
    name: "sqlite-vec",
    kind: "self-managed",
    embeddingCoupling: "fixed",
    isolatedStore: true,
    retrievalDeterministic: true,
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
    retrievalDeterministic: false,
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
    retrievalDeterministic: true,
    source:
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html",
    costNote:
      "Storage + PUT/query request pricing per AWS S3 Vectors (docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-pricing.html, 2026-07); this benchmark's volume is well under $0.01.",
    metadataFiltering: true,
    ingestionNote:
      "Stores the fixed-embedding vectors we provide (float32, cosine); a self-managed, store-isolated reading. Requires AWS credentials and a region where S3 Vectors is available (verified in ap-northeast-1); IAM: s3vectors:CreateVectorBucket/CreateIndex/PutVectors/QueryVectors/DeleteIndex/DeleteVectorBucket.",
  },
  {
    id: "vectorize",
    name: "Cloudflare Vectorize",
    kind: "self-managed",
    embeddingCoupling: "fixed",
    isolatedStore: true,
    retrievalDeterministic: true,
    source: "https://developers.cloudflare.com/vectorize/",
    costNote:
      "Priced per stored-vector-dimension and per queried-vector-dimension (developers.cloudflare.com/vectorize/platform/pricing, 2026-07); this benchmark's volume is within the free allotment.",
    metadataFiltering: true,
    ingestionNote:
      "Stores the fixed-embedding vectors we provide (v2 index, cosine, dimensions in [32,1536]); a self-managed, store-isolated reading. Mutations are eventually consistent (~5-15s), so the polled propagation wait is included in measured ingest. Auth: CLOUDFLARE_ACCOUNT_ID + an API token with Vectorize edit.",
  },
  {
    id: "autorag",
    name: "Cloudflare AutoRAG",
    kind: "managed",
    embeddingCoupling: "managed",
    isolatedStore: false,
    retrievalDeterministic: false,
    source: "https://developers.cloudflare.com/autorag/",
    costNote:
      "Managed pipeline priced on the underlying Workers AI + R2 + Vectorize usage (developers.cloudflare.com/autorag, 2026-07); no separate AutoRAG fee as of source.",
    metadataFiltering: true,
    ingestionNote:
      "Fully-managed: ingests from an R2 bucket and embeds/indexes internally (whole-stack, not store-isolated). Indexing is asynchronous (a 6-hour cycle or a rate-limited force sync); its R2 data-source binding is provisioned via the dashboard, so a live REST-only end-to-end run may render an honest `error` rather than `measured`.",
  },
];
