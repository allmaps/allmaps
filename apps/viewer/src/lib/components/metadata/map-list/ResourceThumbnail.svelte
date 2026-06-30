<script lang="ts">
  import { Thumbnail, MapMonster } from '@allmaps/components'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Ring } from '@allmaps/types'

  import type { ThumbnailRegion } from '$lib/state/maps.svelte.js'
  import { THUMBNAIL_COORDINATE_SIZE } from './thumbnail-config.js'
  import type { ThumbnailErrorMessage } from './types.js'

  type ResourceMask = {
    resourceMask: Ring
    color?: string
    fill?: string
    fillOpacity?: number
    stroke?: string
    strokeOpacity?: number
    strokeWidth?: number
  }

  type Props = {
    resource: GeoreferencedMap['resource']
    thumbnail?: ImageBitmap
    thumbnailError?: ThumbnailErrorMessage
    selected?: boolean
    region?: ThumbnailRegion
    resourceMasks?: (Ring | ResourceMask)[]
    alt: string
  }

  let {
    resource,
    thumbnail,
    thumbnailError,
    selected = false,
    region,
    resourceMasks = [],
    alt
  }: Props = $props()

  let displayedThumbnailError = $derived(thumbnail ? undefined : thumbnailError)
</script>

<div
  class={[
    'flex aspect-square size-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border',
    displayedThumbnailError
      ? 'border-red-200 bg-red/10'
      : selected
        ? 'border-pink-200 bg-pink-100 border-2'
        : 'border-gray-200 inset-shadow-xs bg-white'
  ]}
>
  <Thumbnail
    imageBitmap={thumbnail}
    width={THUMBNAIL_COORDINATE_SIZE}
    sourceWidth={resource.width}
    sourceHeight={resource.height}
    mode="contain"
    padding={8}
    {region}
    {resourceMasks}
    {alt}
    error={displayedThumbnailError}
  >
    {#snippet errorSnippet()}
      <div class="w-full h-full flex items-center justify-center gap-2">
        <div class="size-10 shrink-0 [&_svg]:block [&_svg]:size-full">
          <MapMonster color="red" mood="sad" />
        </div>
      </div>
    {/snippet}
  </Thumbnail>
</div>
