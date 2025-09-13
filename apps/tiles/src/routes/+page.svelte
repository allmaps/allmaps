<script lang="ts">
  import { goto } from '$app/navigation'

  import { Header, Loading, Copy } from '@allmaps/ui'

  import URLInput from '$lib/components/URLInput.svelte'
  import TileJSON from '$lib/components/TileJSON.svelte'
  import Info from '$lib/components/Info.svelte'

  import type { LayoutProps } from './$types'

  import 'ol/ol.css'

  let { data }: LayoutProps = $props()

  let error: string | undefined

  let tileJson = $derived(data.tileJson)
  let tileUrl = $derived(tileJson ? tileJson.tiles[0] : undefined)

  function handleUrlSubmit(url: string) {
    goto(`/?url=${url}`)
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Tile Server">
    {#if tileUrl}
      <Copy string={tileUrl} />
    {/if}
  </Header>
  {#if !tileJson || error}
    <main class="container m-auto p-1 md:p-2">
      {#if !data.url}
        <URLInput
          onsubmit={handleUrlSubmit}
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
      <div
        class="absolute bottom-0 right-0 w-full pointer-events-none max-w-sm"
      >
        <Info {tileUrl} />
      </div>
    </main>
  {/if}
</div>
