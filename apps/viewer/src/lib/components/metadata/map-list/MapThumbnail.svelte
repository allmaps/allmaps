<script lang="ts">
  import { pink } from '@allmaps/tailwind'

  import { getMapsState, type ThumbnailRegion } from '$lib/state/maps.svelte.js'

  import ResourceThumbnail from './ResourceThumbnail.svelte'
  import {
    THUMBNAIL_COORDINATE_SIZE,
    THUMBNAIL_MASK_STROKE_COORDINATE_WIDTH
  } from './thumbnail-config.js'

  import type { MapListRow, ThumbnailErrorMessage } from './types.js'

  type Props = {
    row: MapListRow
    selected?: boolean
    thumbnail?: ImageBitmap
    thumbnailError?: ThumbnailErrorMessage
  }

  let { row, selected = false, thumbnail, thumbnailError }: Props = $props()

  const mapsState = getMapsState()

  let region = $derived(mapsState.getThumbnailRegion(row.map))
  let thumbnailResourceMask = $derived(
    mapsState.getThumbnailResourceMask(
      row.map,
      region,
      THUMBNAIL_COORDINATE_SIZE
    )
  )

  function getMaskStrokeWidth(region?: ThumbnailRegion) {
    const sourceWidth = region?.width || row.resource.width
    const sourceHeight = region?.height || row.resource.height

    if (!sourceWidth || !sourceHeight) {
      return THUMBNAIL_MASK_STROKE_COORDINATE_WIDTH
    }

    return (
      (THUMBNAIL_MASK_STROKE_COORDINATE_WIDTH / THUMBNAIL_COORDINATE_SIZE) *
      Math.max(sourceWidth, sourceHeight)
    )
  }

  let resourceMasks = $derived(
    thumbnailResourceMask
      ? [
          {
            resourceMask: thumbnailResourceMask,
            stroke: pink,
            strokeWidth: getMaskStrokeWidth(region) * (selected ? 1.5 : 0.75)
          }
        ]
      : []
  )
</script>

<ResourceThumbnail
  resource={row.resource}
  {thumbnail}
  {thumbnailError}
  {selected}
  {region}
  {resourceMasks}
  alt={row.thumbnailAlt}
/>
