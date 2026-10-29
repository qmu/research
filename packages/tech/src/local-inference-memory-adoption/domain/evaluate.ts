import type {
  MemoryAdoptionDecision,
  MemoryAdoptionVerdict,
  MemoryUseCase,
  PeakMemoryReading,
} from "./types";

function decideOne(
  reading: PeakMemoryReading,
  ceilingMiB: number,
): MemoryAdoptionDecision {
  if (reading.value === null) return "undetermined";
  return reading.value <= ceilingMiB ? "adopt" : "reject";
}

/** Rolls up the two metric decisions into one verdict: any `reject` rejects
 * outright — a missing reading on the other metric cannot rescue a metric
 * that already failed. Absent a reject, any `undetermined` reading keeps the
 * whole verdict undetermined; it is never counted as a pass. Only
 * both-adopt adopts. */
function rollUp(
  hostRamPeak: MemoryAdoptionDecision,
  gpuVramPeak: MemoryAdoptionDecision,
): MemoryAdoptionDecision {
  if (hostRamPeak === "reject" || gpuVramPeak === "reject") return "reject";
  if (hostRamPeak === "undetermined" || gpuVramPeak === "undetermined")
    return "undetermined";
  return "adopt";
}

export function evaluateMemoryAdoption(
  useCase: MemoryUseCase,
  hostRamPeak: PeakMemoryReading,
  gpuVramPeak: PeakMemoryReading,
): MemoryAdoptionVerdict {
  const hostDecision = decideOne(hostRamPeak, useCase.hostRamPeakMiB);
  const gpuDecision = decideOne(gpuVramPeak, useCase.gpuVramPeakMiB);
  return {
    useCase: useCase.id,
    decision: rollUp(hostDecision, gpuDecision),
    hostRamPeak: hostDecision,
    gpuVramPeak: gpuDecision,
  };
}

export function evaluateMemoryAdoptionForAllUseCases(
  useCases: ReadonlyArray<MemoryUseCase>,
  hostRamPeak: PeakMemoryReading,
  gpuVramPeak: PeakMemoryReading,
): ReadonlyArray<MemoryAdoptionVerdict> {
  return useCases.map((useCase) =>
    evaluateMemoryAdoption(useCase, hostRamPeak, gpuVramPeak),
  );
}
