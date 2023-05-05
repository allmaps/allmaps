<script lang="ts">
  import { Image } from '@allmaps/iiif-parser'
  import { fetchImageInfo } from '@allmaps/stdlib'

  import { imageInfoCache } from '$lib/shared/stores/openlayers.js'

  export let imageUri: string
  export let width: number
  export let height: number

  async function parseImage(imageUri: string) {
    const imageInfo = await fetchImageInfo(imageUri, undefined, imageInfoCache)
    return Image.parse(imageInfo)
  }
</script>

{#await parseImage(imageUri) then parsedImage}
  {#await parsedImage.getThumbnail({ width, height }) then imageRequest}
    {#if Array.isArray(imageRequest)}
      <!-- {#each thumbnail as row, rowIndex}
        {#each row as cell, columnIndex}
          <img alt="thumbnail tile" src={getImageUrl(parsedImage, removeHeight(cell))} />
        {/each}
      {/each} -->
    {:else}
      <img
        alt="thumbnail"
        class="object-contain"
        style:width={`${width}px`}
        style:height={`${height}px`}
        src={parsedImage.getImageUrl(imageRequest)}
      />
    {/if}
  {/await}
{:catch error}
  <div class="content">
    {#if error instanceof Error}
      <p data-error={error.message}>An error occurred!</p>
    {:else}
      <p data-error={String(error)}>An error occurred!</p>
    {/if}
  </div>
{/await}
