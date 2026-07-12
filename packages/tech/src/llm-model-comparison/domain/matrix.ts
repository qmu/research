import type { EffortLevel } from "./effort";
import type { ModelCard } from "./types";

// One (model, effort) configuration to run.
export type Configuration = Readonly<{ card: ModelCard; effort: EffortLevel }>;

// Expand the selected models into the configuration matrix, honoring an optional
// --effort filter (intersected with each card's declared levels).
export const buildComparisonMatrix = (
  cards: ReadonlyArray<ModelCard>,
  efforts: ReadonlyArray<string> | null,
): ReadonlyArray<Configuration> =>
  cards.flatMap((card) => {
    const levels =
      efforts === null
        ? card.effortLevels
        : card.effortLevels.filter((effort) => efforts.includes(effort));
    return levels.map((effort) => ({ card, effort }));
  });

// Instrument-v2 default subject rule (developer decision, 2026-07-12): at most
// `max` efforts per model — the lowest, one intermediate, and the highest of
// the card's declared ladder. Models declaring `max` or fewer levels keep them
// all. Applied to the DEFAULT sweep only; explicit --effort/--configs selectors
// bypass it.
export const capEffortSpread = (
  levels: ReadonlyArray<EffortLevel>,
  max: number,
): ReadonlyArray<EffortLevel> => {
  if (levels.length <= max || max < 1) return levels;
  if (max === 1) return [levels[0] as EffortLevel];
  const first = levels[0] as EffortLevel;
  const last = levels[levels.length - 1] as EffortLevel;
  const middle = levels[Math.ceil((levels.length - 1) / 2)] as EffortLevel;
  const picked = [first, middle, last].slice(0, max);
  return [...new Set(picked)];
};

export const buildDefaultMatrix = (
  cards: ReadonlyArray<ModelCard>,
  maxEffortsPerModel: number,
): ReadonlyArray<Configuration> =>
  cards.flatMap((card) =>
    capEffortSpread(card.effortLevels, maxEffortsPerModel).map((effort) => ({
      card,
      effort,
    })),
  );
