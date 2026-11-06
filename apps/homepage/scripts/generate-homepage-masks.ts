import { writeFile } from 'node:fs/promises'
import { parseAnnotation } from '@allmaps/annotation'

import { getGeojsonPolygon, geometryToPath } from '../src/shared/geometry.ts'

// Keep these versioned annotations in sync with the bundled map outlines.
const annotationUrls = [
  // Ambon
  'https://annotations.allmaps.org/maps/8af5fb867819e6f3@f7b2168e245dc932',
  // Melbourne
  'https://annotations.allmaps.org/maps/752ac3651a9432ed@015c57ddf287e2b9',
  // Paramaribo
  'https://annotations.allmaps.org/maps/0431887a9d208417@f0b68ac47fe5a7b2',
  // Casablanca
  'https://annotations.allmaps.org/maps/6fa4aed2ebd5e14e@50a2151442d78e20',
  // Chicago
  'https://annotations.allmaps.org/maps/57298e3519d47c63@042a601dcde09d02',
  // Vancouver
  'https://annotations.allmaps.org/maps/db6569cd47f3a6c5@d20bdf65c01ac847',
  // Madison
  'https://annotations.allmaps.org/maps/303742196a799825@7341fb9b2c9799a0',
  // Toronto
  'https://annotations.allmaps.org/maps/60459eb8648e36ca@ffe65f7b101b7f6d',
  // Valetta
  'https://annotations.allmaps.org/maps/38ae25630336748e@a4fd6fad900c8b7d',
  // Edinburgh
  'https://annotations.allmaps.org/maps/efa06f142ae9e0b5@a33dde3c5d208f26',
  // Den Haag
  'https://annotations.allmaps.org/maps/6bfaa2dde9a941f2@cc6c19cb2433bfc4',
  // Świnoujście
  'https://annotations.allmaps.org/maps/f5c250b78d26a6f8@def696e05b836a48',
  // Hanoi
  'https://annotations.allmaps.org/maps/dbc3f1835cf237d4@60a70c763fdaa7c4',
  // Holyoke
  'https://annotations.allmaps.org/maps/4426ecd99c57de21@4f8f8e9423771a3b',
  // Coney Island
  'https://annotations.allmaps.org/maps/0c83208cc17694ae@e26881de958b291e',
  // Washington, D.C.
  'https://annotations.allmaps.org/maps/e5c32c229a53f00d@0ff31db3e73c9b8e',
  // Dakar
  'https://annotations.allmaps.org/maps/871fadc753e4e213@2d4fb18080130f19',
  // Tokyo
  'https://annotations.allmaps.org/maps/54569b87a374065f@eeaa6c1bc309bb20',
  // Djakarta
  'https://annotations.allmaps.org/maps/83ec5095adf295af@7dd02a6f3ae37da4',
  // Venice
  'https://annotations.allmaps.org/maps/9b4fe711438e9c2e@82448e356a4cbdd3',
  // Medina
  'https://annotations.allmaps.org/maps/31c1d537d0bd9ff2@055378572bd2e2cd',
  // Delft Library
  'https://annotations.allmaps.org/maps/50942a4e010841aa@1dc28c191077338b',
  // San Antonio
  'https://annotations.allmaps.org/maps/a05aca049adadc77@ef2ac6056432f676'
]

const masks = await Promise.all(
  annotationUrls.map(async (annotationUrl) => {
    const response = await fetch(annotationUrl, {
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) {
      throw new Error(
        `Annotation request failed: ${response.status} ${annotationUrl}`
      )
    }
    const [map] = parseAnnotation(await response.json())
    const path = geometryToPath(getGeojsonPolygon(map), 420)
    if (!path) throw new Error(`Cannot create mask: ${annotationUrl}`)
    return { annotationUrl, map, path }
  })
)

await writeFile(
  new URL('../src/lib/hero/homepage-masks.json', import.meta.url),
  `${JSON.stringify(masks, null, 2)}\n`
)
console.log(`Bundled ${masks.length} homepage maps and outlines`)
