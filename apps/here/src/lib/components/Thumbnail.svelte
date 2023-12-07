<script lang="ts">
  // TODO: move to @allmaps/ui

  import { onMount } from 'svelte'

  import { Image } from '@allmaps/iiif-parser'

  export let imageInfo: unknown
  export let width: number
  export let height: number

  let url = ''
  let parsedImage: Image

  onMount(() => {
    parsedImage = Image.parse(imageInfo)
    const imageRequest = parsedImage.getThumbnail({ width, height }, 'cover')

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
      class="w-full h-full object-cover"
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
