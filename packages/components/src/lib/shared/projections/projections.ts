import Fuse from 'fuse.js'
import Flatbush from 'flatbush'

import { bboxToResolution } from '@allmaps/stdlib'

import type { Bbox } from '@allmaps/types'

export type Projection = {
  code: string
  definition?: string
  name: string
  bbox?: Bbox
  comment?: string
}
type ProjectionWithBbox = Projection & { bbox: Bbox; bboxArea: number }

export function createSearchProjectionsWithFuse(
  projections: Projection[]
): (query: string) => Projection[] {
  const fuse = new Fuse(projections, {
    keys: ['name'], // Fields to search
    threshold: 0.3, // Lower means stricter matching
    minMatchCharLength: 3 // Minimum characters that must match
  })

  return function searchProjections(query: string): Projection[] {
    return fuse.search(query).map((result) => result.item)
  }
}

export function createSuggestProjectionsWithFlatbush(
  projections: Projection[]
): (bbox: Bbox) => Projection[] {
  const projectionWithBbox: ProjectionWithBbox[] = []
  projections.forEach((projection) => {
    if (projection.bbox != undefined) {
      projectionWithBbox.push({
        ...projection,
        bbox: projection.bbox,
        bboxArea: bboxToResolution(projection.bbox)
      })
    }
  })

  const flatbushIndex = new Flatbush(projectionWithBbox.length)
  for (const p of projectionWithBbox) {
    flatbushIndex.add(p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3])
  }
  flatbushIndex.finish()

  return function suggestProjections(bbox: Bbox): Projection[] {
    return flatbushIndex
      .search(...bbox)
      .map((i) => projectionWithBbox[i])
      .sort(
        (projection0, projection1) =>
          projection0.bboxArea - projection1.bboxArea
      )
      .slice(0, 3)
  }
}
