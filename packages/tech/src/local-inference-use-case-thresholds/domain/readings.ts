import {
  engines,
  metricIds,
  type Engine,
  type EngineMetrics,
  type MetricReading,
} from "./types.js";

const reasons = ["NO-FIELD", "NOT-RUN", "MEASURE-FAILED"] as const;

function isEngine(value: string): value is Engine {
  return (engines as ReadonlyArray<string>).includes(value);
}

export function parseReading(
  raw: unknown,
  engine: string,
  metric: string,
): MetricReading {
  if (typeof raw !== "object" || raw === null || !("value" in raw))
    throw new Error(`${engine}.${metric}: reading must have "value"`);
  const { value } = raw as Readonly<{ value: unknown }>;
  if (value === null) {
    // A missing reading carries a reason, not a unit; there is nothing to unit.
    const reason = (raw as Readonly<{ reason?: unknown }>).reason;
    if (
      typeof reason !== "string" ||
      !(reasons as ReadonlyArray<string>).includes(reason)
    )
      throw new Error(
        `${engine}.${metric}: missing reading needs a known "reason"`,
      );
    return { value: null, reason: reason as (typeof reasons)[number] };
  }
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(
      `${engine}.${metric}: "value" must be a finite number or null`,
    );
  const unit = (raw as Readonly<{ unit?: unknown }>).unit;
  if (typeof unit !== "string")
    throw new Error(`${engine}.${metric}: "unit" must be a string`);
  return { value, unit };
}

/** Parses a `{ readings: { <engine>: { <metric>: MetricReading, ... }, ... } }`
 * document into the typed shape `evaluateAllEngines` consumes. Every one of the
 * four engines and four metrics must be present — a metric that was never run
 * is still represented explicitly, as a missing reading with a reason, never
 * omitted. */
export function parseReadings(
  raw: unknown,
): Readonly<Record<Engine, EngineMetrics>> {
  if (typeof raw !== "object" || raw === null || !("readings" in raw))
    throw new Error('input must have a "readings" object');
  const readings = (raw as Readonly<{ readings: unknown }>).readings;
  if (typeof readings !== "object" || readings === null)
    throw new Error('"readings" must be an object');
  const byEngine = readings as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(byEngine))
    if (!isEngine(key)) throw new Error(`unknown engine "${key}"`);
  for (const engine of engines)
    if (!(engine in byEngine)) throw new Error(`missing engine "${engine}"`);

  const result = {} as Record<Engine, EngineMetrics>;
  for (const engine of engines) {
    const perMetric = byEngine[engine];
    if (typeof perMetric !== "object" || perMetric === null)
      throw new Error(`${engine}: metrics must be an object`);
    const byMetric = perMetric as Readonly<Record<string, unknown>>;
    for (const metric of metricIds)
      if (!(metric in byMetric))
        throw new Error(`${engine}: missing metric "${metric}"`);
    result[engine] = {
      ttft: parseReading(byMetric.ttft, engine, "ttft"),
      tps: parseReading(byMetric.tps, engine, "tps"),
      quality: parseReading(byMetric.quality, engine, "quality"),
      peakRss: parseReading(byMetric.peakRss, engine, "peakRss"),
    };
  }
  return result;
}
