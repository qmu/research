/**
 * Client-observed time to the first actual answer token, distinct from the
 * engine's own prompt/decode phase timings (`strata-speed.ts`) and from the
 * raw first streamed delta, which can be a reasoning token rather than answer
 * content.
 */
export type StrataTtftMeasurement =
  | { value: number; unit: "s"; source: "client" }
  | { value: null; unit: "s"; reason: "NO-FIELD" | "MEASURE-FAILED" };

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Import one parsed Strata bench outputs.jsonl record; derive TTFT from
 * `first_answer_offset_s - dispatch_offset_s`, never from `first_delta`,
 * which can mark a reasoning token rather than the answer itself. Only a
 * finished text completion (`stop`/`length`) is accepted: a `tool_calls`
 * finish means the "first answer" offset can itself mark a tool invocation,
 * not text onset, so that case is reported as `MEASURE-FAILED` rather than a
 * misleading latency number.
 */
export function normalizeStrataTtft(record: unknown): StrataTtftMeasurement {
  const row = object(record);
  const failed =
    row.error !== null ||
    typeof row.http_status !== "number" ||
    !Number.isInteger(row.http_status) ||
    row.http_status < 200 ||
    row.http_status >= 300 ||
    (row.finish_reason !== "stop" && row.finish_reason !== "length");
  if (failed) {
    return { value: null, unit: "s", reason: "MEASURE-FAILED" };
  }
  const dispatch = row.dispatch_offset_s;
  const firstAnswer = row.first_answer_offset_s;
  if (dispatch === undefined || firstAnswer === undefined) {
    return { value: null, unit: "s", reason: "NO-FIELD" };
  }
  if (
    typeof dispatch !== "number" ||
    typeof firstAnswer !== "number" ||
    !Number.isFinite(dispatch) ||
    !Number.isFinite(firstAnswer) ||
    dispatch < 0 ||
    firstAnswer < 0 ||
    firstAnswer < dispatch
  ) {
    return { value: null, unit: "s", reason: "MEASURE-FAILED" };
  }
  return { value: firstAnswer - dispatch, unit: "s", source: "client" };
}
