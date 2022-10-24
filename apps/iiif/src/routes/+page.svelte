<script lang="ts">
  import { onMount } from 'svelte'

  import { IIIF } from '@allmaps/iiif-parser'
  import { parseAnnotation } from '@allmaps/annotation'

  import { Header, URLInput, URLType, urlStore } from '@allmaps/ui-components'

  import OpenSeadragon from '$lib/components/OpenSeadragon.svelte'

  import {
    Image as IIIFImage,
    Manifest as IIIFManifest,
    Collection as IIIFCollection
  } from '@allmaps/iiif-parser'

  let iiifUrl: string | undefined
  let loaded = false
  let error: string

  let type: 'manifest' | 'image' | 'collection' | 'annotation'

  let imageUris = new Set<string>()

  onMount(async () => {
    urlStore.subscribe((value) => {
      loadIiifUrl(value)
    })
  })

  function fetchJson(url: string) {
    return fetch(url).then((response) => response.json())
  }

  async function loadIiifUrl(newIiifUrl: string) {
    if (newIiifUrl) {
      iiifUrl = newIiifUrl

      imageUris = new Set()
      loaded = false

      try {
        const json = await fetchJson(iiifUrl)

        if (json.type === 'Annotation' || json.type === 'AnnotationPage') {
          // JSON might be a Georef Annotation
          const maps = parseAnnotation(json)
          type = 'annotation'
          maps.forEach((map) => addImageUri(map.image.uri))
          loaded = true
        } else {
          // JSON might be IIIF data
          const parsedIiif = IIIF.parse(json)
          type = parsedIiif.type

          addImages(parsedIiif)
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          error = err.message
        } else {
          error = 'Unknown error'
        }
      }
    } else {
      iiifUrl = undefined
    }
  }

  function addImageUri(imageUri: string) {
    imageUris.add(imageUri)
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
          addImageUri(next.item.uri)
        }
      }
    } else {
      addImageUri(parsedIiif.uri)
    }

    loaded = true
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="IIIF Viewer">
    {#if iiifUrl}
      <URLInput>
        <URLType {type} />
      </URLInput>
    {/if}
  </Header>
  {#if !iiifUrl || !loaded || error}
    <div class="container m-auto">
      {#if !iiifUrl}
        <URLInput />
      {:else if error}
        <p>Error: {error}</p>
      {:else if !loaded}
        <p>Loading!</p>
      {/if}
    </div>
  {:else}
    <div class="grow">
      <OpenSeadragon imageUris={Array.from(imageUris)} />
    </div>
  {/if}
</div>

<svelte:head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

    :root {
      font-family: 'Inter', sans-serif;
    }
  </style>
</svelte:head>
