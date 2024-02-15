<script lang="ts">
  import { onMount } from 'svelte'

  import { Image } from '@allmaps/iiif-parser'

  export let imageInfo: unknown
  export let width: number
  export let height: number
  export let mode: 'cover' | 'contain' = 'cover'

  let url = ''
  let parsedImage: Image

  onMount(() => {
    parsedImage = Image.parse(imageInfo)
    const imageRequest = parsedImage.getThumbnail({ width, height }, mode)

    if (!Array.isArray(imageRequest)) {
      url = parsedImage.getImageUrl(imageRequest)
    } else {
      throw new Error('Level 0 thumbnails not yet supported')
    }
  })
</script>

<div class="w-full" style="--width: {width}px; --height: {height}px;">
  {#if url}
    <img
      class="w-full h-full {mode === 'cover'
        ? 'object-cover'
        : 'object-contain'}"
      alt={`Thumbnail for ${parsedImage.uri}`}
      src={url}
    />
  {/if}
</div>

<style scoped>
  div {
    width: var(--width);
    height: var(--height);
  }
</style>
