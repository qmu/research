export const NO_EFFORT_LEVEL = "n/a";

export const EFFORT_LEVELS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  NO_EFFORT_LEVEL,
] as const;

export type EffortLevel = (typeof EFFORT_LEVELS)[number];
export type NoEffortLevel = typeof NO_EFFORT_LEVEL;

const EFFORT_LEVEL_SET: ReadonlySet<string> = new Set(EFFORT_LEVELS);

export const isEffortLevel = (effort: string): effort is EffortLevel =>
  EFFORT_LEVEL_SET.has(effort);

export const isNoEffortLevel = (
  effort: string | undefined,
): effort is NoEffortLevel => effort === NO_EFFORT_LEVEL;

export const hasOnlyNoEffortLevel = (
  levels: ReadonlyArray<EffortLevel>,
): levels is readonly [NoEffortLevel] =>
  levels.length === 1 && isNoEffortLevel(levels[0]);

export const isDeclaredEffortLevel = (
  levels: ReadonlyArray<EffortLevel>,
  effort: string,
): effort is EffortLevel =>
  isEffortLevel(effort) && levels.some((level) => level === effort);
