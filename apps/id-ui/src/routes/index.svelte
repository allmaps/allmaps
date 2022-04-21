<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/env'
  import { env } from '$lib/variables'
  import { parseIiif, getThumbnail, getImageUrl } from '@allmaps/iiif-parser'
  import { generateId } from '@allmaps/id/browser'
  import Summary from '../components/Summary.svelte'
  import Image from '../components/Image.svelte'
  import Manifest from '../components/Manifest.svelte'
  import Map from '../components/Map.svelte'
  let id
  let type
  let parsedIiif
  let maps
  let input: HTMLInputElement
  let url: string
  onMount(async () => {
    url = new URLSearchParams(window.location.search).get('url')
  })
  function submit() {
    url = input.value
    const params = new URLSearchParams(window.location.search)
    params.set('url', url)
    window.history.replaceState(
      {},
      '',
      decodeURIComponent(`${window.location.pathname}?${params}`)
    )
  }
  $: {
    if (browser && url) {
      loadIiifUrl(url)
    }
  }
  async function loadIiifUrl(iiifUrl: string) {
    // TODO: try/catch
    const iiifData = await fetch(iiifUrl).then((response) => response.json())
    // TODO: try/catch
    parsedIiif = parseIiif(iiifData)
    type = parsedIiif.type
    id = await generateId(parsedIiif.uri)
    let apiUrl: string
    if (parsedIiif.type === 'image') {
      apiUrl = `${env.apiBaseUrl}/images/${id}/maps`
    } else if (parsedIiif.type === 'manifest') {
      apiUrl = `${env.apiBaseUrl}/manifests/${id}/maps`
    }
    if (apiUrl) {
      // TODO: try/catch
      maps = await fetch(apiUrl).then((response) => response.json())
    }
  }
</script>

<h1>Allmaps IDs</h1>

<form on:submit|preventDefault={submit}>
  <input
    placeholder="IIIF Image or Manifest URL"
    value={url}
    bind:this={input}
  />
  <button type="submit">Submit</button>
  {#if parsedIiif}
    <Summary {id} {parsedIiif} {maps} />
    {#if type === 'image'}
      <Image {id} {parsedIiif} {maps} />
    {:else if type === 'manifest'}
      <Manifest {id} {parsedIiif} {maps} />
    {/if}
  {/if}

  {#if maps && Array.isArray(maps) && maps.length}
    <div>
      This IIIF {parsedIiif.type === 'image' ? 'Image' : 'Manifest'} contains {maps.length}
      georeferenced {maps.length === 1 ? 'map' : 'maps'}:
    </div>
    {#each maps as map (map.id)}
      <Map {map} />
    {/each}
  {:else}
    <div>
      This IIIF {parsedIiif.type === 'image' ? 'Image' : 'Manifest'} does not contain
      any georeferenced maps.
    </div>
  {/if}
</form>

<svelte:head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

    :root {
      font-family: 'Inter', sans-serif;
    }
  </style>
</svelte:head>
