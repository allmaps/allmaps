export const DEFAULT_LIMIT = 250
export const MAX_LIMIT = 750

export function clampLimit(limit: number | undefined): number {
  return Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
}
