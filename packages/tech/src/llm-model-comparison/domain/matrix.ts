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
