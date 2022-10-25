<script lang="ts">
  import { onMount } from 'svelte'

  import { IIIF } from '@allmaps/iiif-parser'
  import { parseAnnotation } from '@allmaps/annotation'

  import { Header, URLInput, URLType, Loading, urlStore } from '@allmaps/ui-components'

  import OpenSeadragon from '$lib/components/OpenSeadragon.svelte'

  import {
    Image as IIIFImage,
    Manifest as IIIFManifest,
    Collection as IIIFCollection
  } from '@allmaps/iiif-parser'

  let url: string | undefined
  let loaded = false
  let error: string

  let type: 'manifest' | 'image' | 'collection' | 'annotation'

  let imageUris = new Set<string>()

  onMount(async () => {
    urlStore.subscribe((value) => {
      loadUrl(value)
    })
  })

  function fetchJson(url: string) {
    return fetch(url).then((response) => response.json())
  }

  async function loadUrl(newUrl: string) {
    if (newUrl) {
      url = newUrl

      imageUris = new Set()
      loaded = false

      try {
        const json = await fetchJson(url)

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
      url = undefined
    }
  }

  function addManifest(manifest: IIIFManifest) {
    manifest.canvases.forEach(({ image }) => addImageUri(image.uri))
  }

  function addImageUri(imageUri: string) {
    imageUris.add(imageUri)
    imageUris = imageUris
  }

  async function addImages(
    parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
  ) {
    if (parsedIiif instanceof IIIFCollection) {
      for await (const next of parsedIiif.fetchNext(fetchJson, {
        fetchImages: false
      })) {
        if (next.item instanceof IIIFManifest) {
          addManifest(next.item)
        }
      }
    } else if (parsedIiif instanceof IIIFManifest) {
      addManifest(parsedIiif)
    } else {
      addImageUri(parsedIiif.uri)
    }

    loaded = true
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="IIIF">
    {#if url}
      <URLInput>
        <URLType {type} />
      </URLInput>
    {/if}
  </Header>
  {#if !url || !loaded || error}
    <div class="container m-auto p-1 md:p-2">
      {#if !url}
        <URLInput />
      {:else if error}
        <p>Error: {error}</p>
      {:else if !loaded}
        <div class="flex gap-4 flex-col items-center">
          <Loading />
          <div>
            {imageUris.size} images loaded…
          </div>
        </div>
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
