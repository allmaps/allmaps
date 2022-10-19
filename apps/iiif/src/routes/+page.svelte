<script lang="ts">
  /// <reference types="OpenSeadragon" />

  import { onMount } from 'svelte'

  import { IIIF } from '@allmaps/iiif-parser'

  import { Header, URLInput, URLType, urlStore } from '@allmaps/ui-components'

  import {
    Image as IIIFImage,
    Manifest as IIIFManifest,
    Collection as IIIFCollection
  } from '@allmaps/iiif-parser'

  let loaded = false
  let error

  let type: string
  let parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
  let images: IIIFImage[] = []

  let openSeadragon: OpenSeadragon.Viewer

  onMount(async () => {
    openSeadragon = OpenSeadragon({
      id: 'openseadragon',
      collectionMode: true,
      collectionRows: 8,
      collectionTileSize: 1024,
      collectionTileMargin: 256,
      collectionLayout: 'vertical',
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      navigationControlAnchor: OpenSeadragon.ControlAnchor.BOTTOM_RIGHT
    })

    urlStore.subscribe((value) => {
      loadIiifUrl(value)
    })
  })

  function fetchJson(url: string) {
    return fetch(url).then((response) => response.json())
  }

  async function loadIiifUrl(iiifUrl: string) {
    if (iiifUrl) {
      images = []
      openSeadragon.world.resetItems()
      openSeadragon.world.removeAll()
      openSeadragon.world.update()

      try {
        const iiifData = await fetchJson(iiifUrl)

        parsedIiif = IIIF.parse(iiifData)
        type = parsedIiif.type
        loaded = true

        addImages(parsedIiif)
      } catch (err: unknown) {
        if (err instanceof Error) {
          error = err.message
        } else {
          error = 'Unknown error'
        }
      }
    }
  }

  function addImage(image: IIIFImage) {
    images.push(image)

    const tileSource = `${image.uri}/info.json`

    openSeadragon.addTiledImage({
      tileSource
    })
  }

  async function addImages(
    parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
  ) {
    if (
      parsedIiif instanceof IIIFCollection ||
      parsedIiif instanceof IIIFManifest
    ) {
      for await (const next of parsedIiif.fetchNext(fetchJson)) {
        if (next.item instanceof IIIFImage) {
          addImage(next.item)
        }
      }
    } else {
      addImage(parsedIiif)
    }
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="IIIF Viewer">
    {#if loaded}
      <URLInput>
        <URLType {type} />
      </URLInput>
    {/if}
  </Header>

  {#if !loaded}
    <URLInput />
  {/if}
  <div id="openseadragon" class:hidden={!loaded} class="grow" />
</div>

<svelte:head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

    :root {
      font-family: 'Inter', sans-serif;
    }
  </style>
</svelte:head>
