import { randomUUID } from "node:crypto";
import {
  CreateIndexCommand,
  CreateVectorBucketCommand,
  DeleteIndexCommand,
  DeleteVectorBucketCommand,
  PutVectorsCommand,
  QueryVectorsCommand,
  S3VectorsClient,
} from "@aws-sdk/client-s3vectors";
import type {
  EmbeddedDocument,
  QueryResult,
  StoreQuery,
  VectorStore,
} from "../../rag-benchmark/domain/types";
import { warnTeardownFailure } from "./teardown";

/**
 * Anti-corruption layer for AWS S3 Vectors — a self-managed store: we provide
 * the fixed-embedding vectors, so this is a store-isolated comparison against
 * sqlite-vec. Credentials and region come from the standard AWS env/credential
 * chain (AWS_PROFILE / AWS_REGION / AWS_ACCESS_KEY_ID …). The test bucket and
 * index are created per run and deleted in close().
 */
export const createS3VectorsStore = (dimensions: number): VectorStore => {
  const client = new S3VectorsClient({});
  const vectorBucketName = `rag-bench-${randomUUID()}`;
  const indexName = "scifact-mini";

  return {
    id: "s3-vectors",
    upsert: async (documents: ReadonlyArray<EmbeddedDocument>) => {
      await client.send(new CreateVectorBucketCommand({ vectorBucketName }));
      await client.send(
        new CreateIndexCommand({
          vectorBucketName,
          indexName,
          dataType: "float32",
          dimension: dimensions,
          distanceMetric: "cosine",
        }),
      );
      await client.send(
        new PutVectorsCommand({
          vectorBucketName,
          indexName,
          vectors: documents.map((row) => ({
            key: row.document.id,
            data: { float32: [...row.vector] },
          })),
        }),
      );
    },
    query: async (
      query: StoreQuery,
      k: number,
    ): Promise<ReadonlyArray<QueryResult>> => {
      const response = await client.send(
        new QueryVectorsCommand({
          vectorBucketName,
          indexName,
          topK: k,
          queryVector: { float32: [...query.vector] },
          returnDistance: true,
        }),
      );
      return (response.vectors ?? []).map((vector) => ({
        documentId: vector.key ?? "",
        // Cosine distance: smaller is closer, so negate for a higher-is-better score.
        score: -(vector.distance ?? 0),
      }));
    },
    close: async () => {
      // Best-effort cleanup so a failed delete does not turn a measured run into
      // an error; a leftover bucket/index would otherwise accrue storage cost,
      // so every failure is a visible stderr warning rather than a silent leak.
      await client
        .send(new DeleteIndexCommand({ vectorBucketName, indexName }))
        .catch(warnTeardownFailure("s3-vectors", `index ${indexName}`));
      await client
        .send(new DeleteVectorBucketCommand({ vectorBucketName }))
        .catch(
          warnTeardownFailure(
            "s3-vectors",
            `vector bucket ${vectorBucketName}`,
          ),
        );
    },
  };
};
