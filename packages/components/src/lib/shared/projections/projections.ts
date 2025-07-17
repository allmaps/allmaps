import Fuse from 'fuse.js'
import Flatbush from 'flatbush'

import { bboxToResolution } from '@allmaps/stdlib'

import type { Bbox } from '@allmaps/types'
import { webMercatorProjection, type Projection } from '@allmaps/project'

export type PickerProjection = Projection<string> & {
  name: string
  definition: string
  code: string
  bbox?: Bbox
  comment?: string
}
type PickerProjectionWithBbox = PickerProjection & {
  bbox: Bbox
  bboxArea: number
}

export const webMercatorPickerProjection: PickerProjection = {
  ...webMercatorProjection,
  name: 'EPSG:3857',
  code: '3857'
}

export function createSearchProjectionsWithFuse(
  projections: PickerProjection[]
): (query: string) => PickerProjection[] {
  const fuse = new Fuse(projections, {
    keys: ['name'], // Fields to search
    threshold: 0.3, // Lower means stricter matching
    minMatchCharLength: 3 // Minimum characters that must match
  })

  return function searchProjections(query: string): PickerProjection[] {
    return fuse.search(query).map((result) => result.item)
  }
}

export function createSuggestProjectionsWithFlatbush(
  projections: PickerProjection[]
): (bbox: Bbox) => PickerProjection[] {
  const projectionWithBbox: PickerProjectionWithBbox[] = []
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

  return function suggestProjections(bbox: Bbox): PickerProjection[] {
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
