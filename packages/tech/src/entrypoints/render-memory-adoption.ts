import { readFile } from "node:fs/promises";
import { memoryUseCases } from "../local-inference-memory-adoption/domain/catalog";
import { renderCommonMemoryAdoptionTable } from "../local-inference-memory-adoption/domain/common-json";

const path = process.argv[2];
if (!path)
  throw new Error("Usage: render-memory-adoption.ts <common-result.json>");
console.log(
  renderCommonMemoryAdoptionTable(
    JSON.parse(await readFile(path, "utf8")),
    memoryUseCases,
  ),
);
