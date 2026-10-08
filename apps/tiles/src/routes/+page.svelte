<script lang="ts">
  import { goto } from '$app/navigation'

  import { Header, Loading, Copy } from '@allmaps/ui'

  import URLInput from '$lib/components/URLInput.svelte'
  import TileJSON from '$lib/components/TileJSON.svelte'
  import Info from '$lib/components/Info.svelte'

  import type { LayoutProps } from './$types'

  let { data }: LayoutProps = $props()

  let tileJson = $derived(data.tileJson)
  let tileUrl = $derived(tileJson ? tileJson.tiles[0] : undefined)

  function handleUrlSubmit(url: string) {
    goto(`/?${new URLSearchParams({ url: url.trim() })}`)
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Tile Server">
    {#if tileUrl}
      <Copy string={tileUrl} />
    {/if}
  </Header>
  {#if !tileJson}
    <main class="container m-auto p-1 md:p-2">
      {#if !data.url || data.error}
        <URLInput
          url={data.url}
          onsubmit={handleUrlSubmit}
          placeholder="Paste an Allmaps annotation, tile, or TileJSON URL"
        />
        {#if data.error}
          <p role="alert" class="mt-3 px-3 text-sm text-red-700">
            {data.error}
          </p>
        {/if}
      {:else if !tileJson}
        <div class="flex flex-col items-center">
          <Loading />
        </div>
      {/if}
    </main>
  {:else}
    <main class="grow relative">
      {#key tileJson}
        <TileJSON {tileJson} />
      {/key}
      <div
        class="absolute bottom-0 right-0 w-full pointer-events-none max-w-sm"
      >
        <Info {tileUrl} />
      </div>
    </main>
  {/if}
</div>
