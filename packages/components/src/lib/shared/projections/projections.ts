import Fuse from 'fuse.js'
import Flatbush from 'flatbush'

import { bboxToResolution } from '@allmaps/stdlib'
import { webMercatorProjection } from '@allmaps/project'

import type { Bbox } from '@allmaps/types'
import type { Projection } from '@allmaps/project'

export type PickerProjection = Projection & {
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

function emptyIndex(_: unknown): PickerProjection[] {
  return []
}

export function createFullTextIndex(
  projections: PickerProjection[]
): (query: string) => PickerProjection[] {
  if (projections.length === 0) {
    return emptyIndex
  }

  const fuse = new Fuse(projections, {
    // Fields to search
    keys: ['name'],
    // Lower means stricter matching
    threshold: 0.2,
    // Minimum characters that must match
    minMatchCharLength: 0
  })

  return function (query: string): PickerProjection[] {
    return fuse.search(query).map((result) => result.item)
  }
}

export function createBboxIndex(
  projections: PickerProjection[]
): (bbox: Bbox) => PickerProjection[] {
  if (projections.length === 0) {
    return emptyIndex
  }

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
  for (const { bbox } of projectionWithBbox) {
    flatbushIndex.add(bbox[0], bbox[1], bbox[2], bbox[3])
  }
  flatbushIndex.finish()

  return function (bbox: Bbox): PickerProjection[] {
    return flatbushIndex
      .search(...bbox)
      .map((index) => projectionWithBbox[index])
      .sort(
        (projection0, projection1) =>
          projection0.bboxArea - projection1.bboxArea
      )
  }
}
