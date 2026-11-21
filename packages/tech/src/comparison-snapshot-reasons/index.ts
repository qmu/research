/** Public, side-effect-free API for saved comparison rationale. */
export {
  ADOPTION_REASON_ORDER,
  readSavedComparisonReasons,
} from "./domain/read";
export type {
  AdoptionReason,
  SnapshotReasonResult,
  SnapshotReasons,
} from "./domain/read";
