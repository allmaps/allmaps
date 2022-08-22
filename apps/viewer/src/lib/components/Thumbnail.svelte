<script lang="ts">
  import { Image } from '@allmaps/iiif-parser'

  export let imageUri: string
  export let width: number

  // let parsedImage: Image

  // $: (async () => (parsedImage = await parseImage(imageUri)))()

  async function fetchJSON(url: string) {
    const response = await fetch(url)
    const json = await response.json()
    return json
  }

  async function fetchImage(imageUri: string) {
    const json = await fetchJSON(`${imageUri}/info.json`)
    return json
  }

  async function parseImage(imageUri: string) {
    const image = await fetchImage(imageUri)
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

<div />

{#await parseImage(imageUri) then parsedImage}
  {#await parsedImage.getThumbnail({ width, height: width }) then imageRequest}
    {#if Array.isArray(imageRequest)}
      <!-- {#each thumbnail as row, rowIndex}
        {#each row as cell, columnIndex}
          <img alt="thumbnail tile" src={getImageUrl(parsedImage, removeHeight(cell))} />
        {/each}
      {/each} -->
    {:else}
      <img
        alt="thumbnail"
        class="single"
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

<style>
  img.single {
    top: 0;
    left: 0;
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
