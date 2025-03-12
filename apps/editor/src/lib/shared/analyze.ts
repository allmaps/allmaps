import type { GeoreferencedMap } from '@allmaps/annotation'

export function isComplete(map: GeoreferencedMap): boolean {
  return map.gcps.length >= 2
}
