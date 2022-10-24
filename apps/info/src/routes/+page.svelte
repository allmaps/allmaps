<script lang="ts">
  import { IIIF } from '@allmaps/iiif-parser'
  import { parseAnnotation } from '@allmaps/annotation'

  import { Header, URLInput, URLType, urlStore } from '@allmaps/ui-components'

  import Image from '$lib/components/Image.svelte'
  import Manifest from '$lib/components/Manifest.svelte'
  import Collection from '$lib/components/Collection.svelte'
  import Annotation from '$lib/components/Annotation.svelte'

  import type { Map as MapType } from '@allmaps/annotation'
  import {
    Image as IIIFImage,
    Manifest as IIIFManifest,
    Collection as IIIFCollection
  } from '@allmaps/iiif-parser'

  let loaded = false
  let type: 'image' | 'annotation' | 'collection' | 'manifest'
  let error: string

  let parsedIiif: IIIFImage | IIIFManifest | IIIFCollection | undefined
  let maps: MapType[]

  urlStore.subscribe((value) => {
    loadUrl(value)
  })

  async function loadUrl(url: string) {
    try {
      const json = await fetch(url).then((response) => response.json())

      if (json.type === 'Annotation' || json.type === 'AnnotationPage') {
        // The JSON data might be a Georef Annotation
        maps = parseAnnotation(json)
        parsedIiif = undefined

        type = 'annotation'
      } else {
        // Try to parse IIIF data
        parsedIiif = IIIF.parse(json)
        maps = []

        type = parsedIiif.type
      }

      loaded = true
    } catch (err: unknown) {
      if (err instanceof Error) {
        error = err.message
      } else {
        error = 'Unknown error'
      }
    }
  }
</script>

<Header appName="Info">
  {#if loaded}
    <URLInput>
      <URLType {type} />
    </URLInput>
  {/if}
</Header>

<main class="md:container md:mx-auto p-2 overflow-auto">
  {#if loaded}
    {#if parsedIiif instanceof IIIFImage}
      <Image {parsedIiif} />
    {:else if parsedIiif instanceof IIIFManifest}
      <Manifest {parsedIiif} />
    {:else if parsedIiif instanceof IIIFCollection}
      <Collection {parsedIiif} />
    {:else}
      <Annotation {maps} />
    {/if}
  {:else}
    <URLInput />
  {/if}
</main>

<svelte:head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

    :root {
      font-family: 'Inter', sans-serif;
    }
  </style>
</svelte:head>
