<script lang="ts">
  /// <reference types="OpenSeadragon" />

  import { onMount } from 'svelte'

  export let imageUris: string[]

  onMount(() => {
    const tileSources = imageUris.map((imageUri) => `${imageUri}/info.json`)

    const columns = Math.floor(Math.sqrt(tileSources.length))

    const openSeadragon = OpenSeadragon({
      id: 'openseadragon',
      collectionMode: true,
      collectionRows: columns,
      collectionTileSize: 1024,
      collectionTileMargin: 256,
      // collectionLayout: 'vertical',
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      navigationControlAnchor: OpenSeadragon.ControlAnchor.BOTTOM_RIGHT,
      tileSources
    })
  })
</script>

<div id="openseadragon" class="w-full h-full" />
