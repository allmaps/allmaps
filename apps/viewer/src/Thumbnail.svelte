<script>
  import { parseIiif, getImageUrl, getThumbnail } from  '@allmaps/iiif-parser'

  export let imageUri
  export let width

  let parsedImage
  $: (async () => parsedImage = await parseImage(imageUri))()

  async function fetchJSON (url) {
    const response = await fetch(url)
    const json = await response.json()
    return json
  }

  async function fetchImage (imageUri) {
    const json = await fetchJSON(`${imageUri}/info.json`)
    return json
  }

  async function parseImage (imageUri) {
    const image = await fetchImage(imageUri)
    return parseIiif(image)
  }

  function removeHeight ({ region, size }) {
    return {
      region,
      size: {
        width: size.width
      }
    }
  }
</script>

{#if parsedImage}
  {#await getThumbnail(parsedImage, width, width) then thumbnail}
    {#if Array.isArray(thumbnail) }
    	{#each thumbnail as row, rowIndex}
        {#each row as cell, columnIndex}
          <img src={getImageUrl(parsedImage, removeHeight(cell))} />
        {/each}
      {/each}
    {:else}
      <img class="single" src={getImageUrl(parsedImage, thumbnail)} />
    {/if}
  {:catch error}
    <div class="content">
      <p data-error={ error.message }>An error occurred!</p>
    </div>
  {/await}
{/if}

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