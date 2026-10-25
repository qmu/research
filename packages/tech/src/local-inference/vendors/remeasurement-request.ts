import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  remeasurementRequest,
  type RecoverableResult,
  type RemeasurementBinding,
} from "../domain/remeasurement.js";
import { updateCompletedExecution } from "./versioned-result.js";

/** Idempotently persist one request in the measurement artifact itself.
 * No retry is executed. A different binding must use a separate result.
 */
export async function saveRemeasurementRequest(
  output: string,
  binding: RemeasurementBinding,
) {
  binding = structuredClone(binding);
  const result = await updateCompletedExecution(
    output,
    binding.execution,
    (value) => {
      const result = value as RecoverableResult;
      const existing = result.remeasurementRequest;
      const request = remeasurementRequest(
        result,
        binding,
        existing?.requestId ?? randomUUID(),
      );
      if (existing !== undefined) {
        if (!isDeepStrictEqual(existing, request))
          throw new Error("INVALID-REMEASUREMENT-REQUEST");
        return result;
      }
      return request ? { ...result, remeasurementRequest: request } : result;
    },
  );
  return result.remeasurementRequest ?? null;
}
