export const scratchM = (value: unknown): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  return true;
};
