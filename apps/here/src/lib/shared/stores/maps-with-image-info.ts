import { derived } from 'svelte/store'

import { maps } from '$lib/shared/stores/maps.js'
import { imageInfos } from '$lib/shared/stores/image-infos.js'

import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

export const mapsWithImageInfo = derived(
  [maps, imageInfos],
  ([$maps, $imageInfos]) =>
    [...$maps.values()]
      .filter((map) => $imageInfos.has(map.resource.id))
      .map((map) => ({
        map,
        imageInfo: $imageInfos.get(map.resource.id) as ImageInformationResponse
      }))
)
