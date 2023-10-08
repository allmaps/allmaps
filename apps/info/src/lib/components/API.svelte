<script lang="ts">
  import { onMount } from 'svelte'

  import { generateId } from '@allmaps/id'

  import { env } from '$lib/shared/variables.js'

  import Maps from '$lib/components/Maps.svelte'
  // import { browser } from '$app/environment'

  import type { Map as MapType } from '@allmaps/annotation'

  import {
    Image as IIIFImage,
    Manifest as IIIFManifest,
    Collection as IIIFCollection
  } from '@allmaps/iiif-parser'
  import { validateMap } from '@allmaps/annotation'

  // import { iiifTypeToString } from '$lib/shared/strings.js'
  // export let id: string
  export let parsedIiif: IIIFImage | IIIFManifest | IIIFCollection

  let id: string
  let maps: MapType[]

  onMount(async () => {
    id = await generateId(parsedIiif.uri)

    let apiUrl: string | undefined

    if (parsedIiif instanceof IIIFImage) {
      apiUrl = `${env.apiBaseUrl}/images/${id}/maps`
    } else if (parsedIiif instanceof IIIFManifest) {
      apiUrl = `${env.apiBaseUrl}/manifests/${id}/maps`
    } else if (parsedIiif instanceof IIIFCollection) {
      apiUrl = `${env.apiBaseUrl}/collections/${id}/maps`
    }

    try {
      if (apiUrl) {
        const json = await fetch(apiUrl).then((response) => response.json())
        const mapOrMaps = validateMap(json)
        if (Array.isArray(mapOrMaps)) {
          maps = mapOrMaps
        } else {
          maps = [mapOrMaps]
        }
      }
    } catch (err: unknown) {
      console.error('No maps found for', parsedIiif.uri)
    }
  })
</script>

<p>Its URI is:</p>
<pre><code>{parsedIiif.uri}</code></pre>
<p>Its Allmaps ID is:</p>
<pre><code>{id}</code></pre>
<p>
  This ID is computed by taking the first 16 hexadecimal characters of the
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest"
    >SHA-1 hash</a
  > of the URI.
</p>

{#if maps}
  <Maps {maps} api={true} />
{:else}
  No georeferenced maps found in the Allmaps API for this ID. You can
  georeference this image with in Allmaps Editor.
  <!-- <a href={editorUrl}>Allmaps Editor</a>. -->
{/if}
