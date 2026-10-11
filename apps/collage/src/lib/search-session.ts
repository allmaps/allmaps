import type { SearchPlace, SearchResults, ImportMask } from './map-search.ts'

export type RecentSearch = {
  place: SearchPlace
  meters: number
  current?: string
  importMask?: ImportMask
}
const key = 'allmaps-collage-search-v1'
let memory: RecentSearch[] = []
// Keep responses in memory, not sessionStorage: scans can be large. A page reload
// refetches results. Selections are deliberately never stored or restored.
export const searchCache = new Map<string, SearchResults>()
export const searchKey = (entry: RecentSearch) =>
  `circle:${entry.place.feature.geometry.coordinates.join(',')}:${entry.meters}`

export function readSearches(
  storage?: Pick<Storage, 'getItem'>
): RecentSearch[] {
  if (!storage) return memory
  try {
    const entries = JSON.parse(storage.getItem(key) ?? '[]')
    if (!Array.isArray(entries)) return []
    return entries
      .filter(
        (entry) =>
          entry?.place?.id &&
          entry.place.label &&
          entry.place.feature?.geometry?.type === 'Point' &&
          Number.isFinite(entry.meters) &&
          entry.meters >= 10 &&
          entry.meters <= 50000 &&
          (entry.importMask === undefined ||
            ['circle', 'original', 'full'].includes(entry.importMask))
      )
      .slice(0, 8)
      .map(({ place, meters, current, importMask }) => ({
        place,
        meters,
        current,
        importMask
      }))
  } catch {
    return []
  }
}

export function saveSearch(
  storage: Pick<Storage, 'setItem'> | undefined,
  entries: RecentSearch[],
  entry: RecentSearch
) {
  const next = [
    structuredClone({
      place: entry.place,
      meters: entry.meters,
      current: entry.current,
      importMask: entry.importMask
    }),
    ...entries.filter((other) => searchKey(other) !== searchKey(entry))
  ].slice(0, 8)
  try {
    storage?.setItem(key, JSON.stringify(next))
  } catch {
    /* Private/full storage: memory still works. */
  }
  memory = next
  return next
}

export function cacheSearch(entry: RecentSearch, results: SearchResults) {
  searchCache.delete(searchKey(entry))
  searchCache.set(searchKey(entry), results)
  if (searchCache.size > 8) searchCache.delete(searchCache.keys().next().value!)
}

export function removeSearch(
  storage: Pick<Storage, 'setItem'> | undefined,
  entries: RecentSearch[],
  entry: RecentSearch
) {
  const next = entries.filter((other) => searchKey(other) !== searchKey(entry))
  searchCache.delete(searchKey(entry))
  try {
    storage?.setItem(key, JSON.stringify(next))
  } catch {
    /* Memory still works. */
  }
  memory = next
  return next
}
