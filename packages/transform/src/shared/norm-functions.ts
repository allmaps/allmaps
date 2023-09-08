import type { Position } from '@allmaps/types'

export function euclideanNorm(
  position1: Position,
  positions2: Position
): number {
  const sub = [positions2[0] - position1[0], positions2[1] - position1[1]]
  const norm = Math.sqrt(sub[0] ** 2 + sub[1] ** 2)
  return norm
}
