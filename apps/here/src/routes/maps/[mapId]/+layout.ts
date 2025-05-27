import { error } from '@sveltejs/kit'

import { fetchJson, fetchImageInfo } from '@allmaps/stdlib'
import { parseAnnotation } from '@allmaps/annotation'

import { getMapLabels, formatLabels } from '$lib/shared/metadata.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { LayoutLoad } from './$types.js'

export const load: LayoutLoad = async ({ params, fetch }) => {
  const { mapId: allmapsMapId } = params

  const mapId = `https://annotations.allmaps.org/maps/${allmapsMapId}`

  let map: GeoreferencedMap
  let imageInfo: unknown

  try {
    const annotation = await fetchJson(mapId, undefined, fetch)
    const maps = parseAnnotation(annotation)
    map = maps[0]
  } catch (err) {
    error(404, {
      message: 'Map not found'
    })
  }

  const imageId = map.resource.id

  try {
    imageInfo = await fetchImageInfo(imageId, undefined, fetch)
  } catch (err) {
    error(404, {
      message: 'Failed to fetch IIIF Image'
    })
  }

  const labels = getMapLabels(map)
  const title = formatLabels(labels, 46 - ' | Allmaps Here'.length)

  return {
    mapId,
    labels,
    title,
    selectedMapWithImageInfo: {
      mapId,
      map,
      imageInfo
    }
  }
}
