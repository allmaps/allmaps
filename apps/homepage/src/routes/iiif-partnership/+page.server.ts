import { partnershipMapSources } from '$lib/data/partnership-maps.js'
import { getExampleImage } from '$lib/data/screenshot-images.js'
import imageAssets from '$lib/data/image-assets.json'
import { loadMaskedMap } from '$lib/server/masked-map.js'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch }) => ({
  maskedMaps: await Promise.all(
    partnershipMapSources.map(async ({ annotationUrl, previewImage }) => {
      const map = await loadMaskedMap(fetch, annotationUrl)
      if (!previewImage) return map
      const image = getExampleImage(`partnership-${previewImage.slug}`)
      const asset = Object.values(imageAssets).find(
        ({ url }) => url === image.src
      )
      if (!asset)
        throw new Error(`Missing partnership image: ${previewImage.slug}`)
      return {
        ...map,
        imageUrl: image.src,
        imageSrcset: image.srcset,
        imageSizes: 'auto, (max-width: 639px) 100vw, 384px',
        intrinsicWidth: asset.width,
        intrinsicHeight: asset.height
      }
    })
  )
})
