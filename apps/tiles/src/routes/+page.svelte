<script lang="ts">
  import { onMount } from 'svelte'

  import { Header, URLInput, Loading, urlStore } from '@allmaps/ui'
  import { fetchJson } from '@allmaps/stdlib'

  import TileJSON from '$lib/components/TileJSON.svelte'

  import 'ol/ol.css'

  let mounted = false
  let error: string | undefined

  let tileJson: {} | undefined

  onMount(async () => {
    mounted = true
    urlStore.subscribe(async ($url) => {
      tileJson = await fetchJson($url)
    })
  })
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Tile Server">
    {#if $urlStore}
      <URLInput />
    {/if}
  </Header>
  {#if !$urlStore || !tileJson || error}
    <main class="container m-auto p-1 md:p-2">
      {#if !$urlStore && mounted}
        <URLInput />
      {:else if error}
        <div class="flex flex-col items-center">
          <p>Error: {error}</p>
        </div>
      {:else if !tileJson}
        <div class="flex flex-col items-center">
          <Loading />
        </div>
      {/if}
    </main>
  {:else}
    <main class="grow">
      <TileJSON {tileJson} />
    </main>
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
