import rawCatalog from "../use-cases.json";
import type { MemoryUseCase } from "./types";

/** `use-cases.json` is the hand-authored source of truth (reviewable without
 * touching code); this module only type-checks it on load. A malformed entry
 * throws at import time rather than producing a silently-wrong ceiling. */

type RawUseCase = Readonly<{
  id: string;
  label: string;
  hostRamPeakMiB: number;
  gpuVramPeakMiB: number;
  rationale: string;
}>;

type RawCatalog = Readonly<{
  status: string;
  note: string;
  useCases: ReadonlyArray<RawUseCase>;
}>;

// The JSON import's inferred type is derived structurally from the literal
// file; routing it through `unknown` avoids relying on that inference
// overlapping with the hand-written shape below, which this module validates
// at runtime regardless.
const catalog = rawCatalog as unknown as RawCatalog;

function parseCeiling(value: number, useCaseId: string, field: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(
      `use case "${useCaseId}": ${field} must be a positive finite number`,
    );
  return value;
}

function parseUseCase(useCase: RawUseCase): MemoryUseCase {
  return {
    id: useCase.id,
    label: useCase.label,
    hostRamPeakMiB: parseCeiling(
      useCase.hostRamPeakMiB,
      useCase.id,
      "hostRamPeakMiB",
    ),
    gpuVramPeakMiB: parseCeiling(
      useCase.gpuVramPeakMiB,
      useCase.id,
      "gpuVramPeakMiB",
    ),
    rationale: useCase.rationale,
  };
}

function assertUniqueIds(useCases: ReadonlyArray<RawUseCase>): void {
  const seen = new Set<string>();
  for (const useCase of useCases) {
    if (seen.has(useCase.id))
      throw new Error(`duplicate use case id "${useCase.id}"`);
    seen.add(useCase.id);
  }
}

assertUniqueIds(catalog.useCases);

export const memoryUseCaseCatalogStatus: string = catalog.status;
export const memoryUseCaseCatalogNote: string = catalog.note;

export const memoryUseCases: ReadonlyArray<MemoryUseCase> =
  catalog.useCases.map(parseUseCase);

export function memoryUseCaseById(id: string): MemoryUseCase {
  const useCase = memoryUseCases.find((candidate) => candidate.id === id);
  if (!useCase) throw new Error(`unknown memory use case "${id}"`);
  return useCase;
}
