<script lang="ts">
  import { Image } from '@allmaps/iiif-parser'

  export let imageUri: string

  export let width: number
  export let height: number

  // TODO: move to stdlib
  async function fetchJSON(url: string) {
    const response = await fetch(url)
    const json = await response.json()
    return json
  }

  // TODO: move to stdlib
  async function fetchImageInfo(imageUri: string) {
    const json = await fetchJSON(`${imageUri}/info.json`)
    return json
  }

  async function parseImage(imageUri: string) {
    const image = await fetchImageInfo(imageUri)
    return Image.parse(image)
  }

  // function removeHeight ({ region, size }: {region: number, size: number}) {
  //   return {
  //     region,
  //     size: {
  //       width: size.width
  //     }
  //   }
  // }
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
