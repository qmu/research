import Database from "better-sqlite3";
import { load as loadSqliteVec } from "sqlite-vec";
import type {
  EmbeddedDocument,
  QueryResult,
  StoreQuery,
  Vector,
  VectorStore,
} from "../../rag-benchmark/domain/types";

const toFloat32 = (vector: Vector): Float32Array => Float32Array.from(vector);

type SearchRow = Readonly<{ id: string; distance: number }>;

export const createSqliteVecStore = (dimensions: number): VectorStore => {
  const db = new Database(":memory:");
  loadSqliteVec(db);
  db.exec(
    `create virtual table vec_documents using vec0(
      id text primary key,
      embedding float[${dimensions}]
    )`,
  );
  const insert = db.prepare<[string, Float32Array]>(
    "insert or replace into vec_documents(id, embedding) values (?, ?)",
  );
  const search = db.prepare<[Float32Array, number], SearchRow>(
    "select id, distance from vec_documents where embedding match ? and k = ? order by distance",
  );

  return {
    id: "sqlite-vec",
    upsert: async (documents: ReadonlyArray<EmbeddedDocument>) => {
      const transaction = db.transaction(
        (rows: ReadonlyArray<EmbeddedDocument>) => {
          for (const row of rows) {
            insert.run(row.document.id, toFloat32(row.vector));
          }
        },
      );
      transaction(documents);
    },
    query: async (
      query: StoreQuery,
      k: number,
    ): Promise<ReadonlyArray<QueryResult>> =>
      search.all(toFloat32(query.vector), k).map((row) => ({
        documentId: row.id,
        score: -row.distance,
      })),
    close: () => {
      db.close();
    },
  };
};
