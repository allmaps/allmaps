<script lang="ts">
  import { onMount } from 'svelte'

  import { Header, URLInput, Loading, Copy, urlStore } from '@allmaps/ui'
  import { fetchJson } from '@allmaps/stdlib'

  import TileJSON from '$lib/components/TileJSON.svelte'
  import Info from '$lib/components/Info.svelte'

  import type { TileJSON as TileJSONType } from '$lib/types.js'

  import 'ol/ol.css'

  let mounted = false
  let error: string | undefined

  let tileJson: TileJSONType | undefined
  let tileUrl: string | undefined

  onMount(async () => {
    mounted = true
    urlStore.subscribe(async ($url) => {
      tileJson = (await fetchJson($url)) as TileJSONType
      tileUrl = tileJson.tiles[0]
    })
  })
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Tile Server">
    {#if $urlStore && tileUrl}
      <Copy string={tileUrl} />
    {/if}
  </Header>
  {#if !$urlStore || !tileJson || error}
    <main class="container m-auto p-1 md:p-2">
      {#if !$urlStore && mounted}
        <URLInput
          placeholder="Type the URL of a Allmaps Tile Server TileJSON file"
        />
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
    <main class="grow relative">
      <TileJSON {tileJson} />
      <div class="absolute bottom-0 w-full pointer-events-none">
        <Info {tileUrl} />
      </div>
    </main>
  {/if}
</div>
