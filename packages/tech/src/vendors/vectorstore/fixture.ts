import type {
  EmbeddedDocument,
  QueryResult,
  Vector,
  VectorStore,
} from "../../rag-benchmark/domain/types";

const dot = (a: Vector, b: Vector): number =>
  a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);

export const createFixtureVectorStore = (): VectorStore => {
  const rows: Array<EmbeddedDocument> = [];
  return {
    id: "fixture-vector-store",
    upsert: async (documents) => {
      rows.splice(0, rows.length, ...documents);
    },
    query: async (vector, k): Promise<ReadonlyArray<QueryResult>> =>
      [...rows]
        .map((row) => ({
          documentId: row.document.id,
          score: dot(row.vector, vector),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k),
  };
};
