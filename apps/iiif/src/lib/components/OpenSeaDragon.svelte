<script lang="ts">
  import { onMount } from 'svelte'

  import { Collection } from '@allmaps/iiif-parser'

  let parsedCollection: Collection | undefined

  async function fetchJson(url: string) {
    const response = await fetch(url)
    return await response.json()
  }

  onMount(async () => {
    const iiifData = await fetchJson(
      'https://raw.githubusercontent.com/theberlage/river-maps/main/iiif/collections/river-maps.json'
    )

    parsedCollection = Collection.parse(iiifData)

    // console.dir(parsedCollection)
    for await (const next of parsedCollection.fetchNext(fetchJson, {
      maxDepth: 2,
      fetchManifests: true,
      fetchImages: false
    })) {
      parsedCollection = parsedCollection
    }
  })
</script>

<div>
  {#if parsedCollection}
    <div>{parsedCollection.uri}</div>
    <ol>
      {#each parsedCollection.items as manifest}
        <li>
          <div>{manifest.type}</div>
          {#if manifest.type === 'manifest' && manifest.canvases}
            <ol>
              {#each manifest.canvases as canvas}
                <li><img src={canvas.image.getImageUrl(canvas.image.getThumbnail({width:100,height: 100}))} /></li>
              {/each}
            </ol>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  ol {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
</style>
