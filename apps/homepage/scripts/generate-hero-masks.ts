import { existsSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import turfRewind from '@turf/rewind'
import { validateGeoreferencedMap } from '@allmaps/annotation'
import { ProjectedGcpTransformer } from '@allmaps/project'
import { geometryToGeojsonGeometry } from '@allmaps/stdlib'

import { geometryToPath } from '../src/shared/geometry.ts'

const pageDirectories = await readdir(
  new URL('../src/routes/(content)/', import.meta.url),
  { withFileTypes: true }
)
const pageNames = pageDirectories
  .filter(
    (directory) =>
      directory.isDirectory() &&
      existsSync(
        new URL(
          `../src/routes/(content)/${directory.name}/+page.svx`,
          import.meta.url
        )
      )
  )
  .map((directory) => directory.name)
  .sort()
// Append special layouts to preserve the existing content-page date cutoffs.
pageNames.push('iiif-partnership')
const selectedPage = process.argv[2]
if (selectedPage && !pageNames.includes(selectedPage)) {
  throw new Error(`Unknown hero page: ${selectedPage}`)
}
const masksFile = new URL('../src/lib/hero/masks.json', import.meta.url)
const seenMapIds = new Set<string>()
const pages: Record<
  string,
  { source: string; masks: { id: string; path: string }[] }
> = selectedPage ? JSON.parse(await readFile(masksFile, 'utf8')).pages : {}
for (const [pathname, collection] of Object.entries(pages)) {
  if (pathname !== `/${selectedPage}`) {
    for (const mask of collection.masks) seenMapIds.add(mask.id)
  }
}
const refreshDate = new Date()

for (const [index, pageName] of pageNames.entries()) {
  if (selectedPage && pageName !== selectedPage) continue
  const masksPerPage = pageName === 'iiif-partnership' ? 150 : 60
  // Separate date cutoffs give each page a different slice of the collection.
  const cutoff = new Date(refreshDate)
  cutoff.setUTCDate(cutoff.getUTCDate() - index * 90)
  const source = new URL('https://api.allmaps.org/maps')
  source.searchParams.set('limit', '180')
  source.searchParams.set('modifiedBefore', cutoff.toISOString())

  const response = await fetch(source, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Map request failed: ${response.status}`)
  const maps: unknown = await response.json()
  if (!Array.isArray(maps)) throw new Error('Expected a collection of maps')

  const masks = maps
    .flatMap((value) => {
      try {
        const validated = validateGeoreferencedMap(value)
        const map = Array.isArray(validated) ? validated[0] : validated
        if (!map.id || seenMapIds.has(map.id)) return []
        const transformer = ProjectedGcpTransformer.fromGeoreferencedMap(map, {
          transformationType: 'polynomial'
        })
        const polygon = geometryToGeojsonGeometry(
          transformer.transformToGeo([map.resourceMask])
        )
        turfRewind(polygon, { mutate: true, reverse: true })
        const path = geometryToPath(polygon, 100, 100, 0.8)
        return path ? [{ id: map.id, path }] : []
      } catch {
        return []
      }
    })
    .slice(0, masksPerPage)

  if (masks.length < masksPerPage) {
    throw new Error(`Not enough distinct usable masks for ${pageName}`)
  }
  for (const mask of masks) seenMapIds.add(mask.id)
  pages[`/${pageName}`] = { source: source.href, masks }
  console.log(`Bundled ${masks.length} masks for /${pageName}`)
}

await writeFile(masksFile, `${JSON.stringify({ pages }, null, 2)}\n`)
