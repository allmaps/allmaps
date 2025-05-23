import { error } from '@sveltejs/kit'

import { fetchJson, fetchImageInfo } from '@allmaps/stdlib'
import { parseAnnotation } from '@allmaps/annotation'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { LayoutLoad } from './$types.js'

export const load: LayoutLoad = async ({ parent, fetch }) => {
  const { selectedMapId } = await parent()

  let map: GeoreferencedMap
  let imageInfo: unknown

  try {
    const annotation = await fetchJson(selectedMapId, undefined, fetch)
    const maps = parseAnnotation(annotation)
    map = maps[0]
  } catch (err) {
    error(404, {
      message: 'Map not found',
      url: selectedMapId
    })
  }

  const imageId = map.resource.id

  try {
    imageInfo = await fetchImageInfo(imageId, undefined, fetch)
  } catch (err) {
    error(404, {
      message: 'Failed to fetch IIIF Image',
      url: `${imageId}/info.json`
    })
  }

  return {
    selectedMapWithImageInfo: {
      mapId: selectedMapId,
      map,
      imageInfo
    }
  }
}
