<script lang="ts">
  import { onDestroy } from 'svelte'
  import { page } from '$app/state'
  import { afterNavigate } from '$app/navigation'

  import { Header } from '@allmaps/ui'

  import type { Snippet } from 'svelte'

  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'
  import { setSensorsState } from '$lib/state/sensors.svelte.js'
  import { setUrlState } from '$lib/state/url.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  const errorState = setErrorState()
  const imageInfoState = setImageInfoState()
  const sensorState = setSensorsState(errorState)
  const urlState = setUrlState(page.url, errorState)
  setUiState()
  setMapsState(sensorState, imageInfoState)

  interface Props {
    children?: Snippet
  }

  let { children }: Props = $props()

  afterNavigate(() => {
    urlState.updateUrl(page.url)
  })

  onDestroy(() => {
    sensorState.destroy()
  })
</script>

<svelte:head>
  <meta property="og:description" content="test SSR" />
</svelte:head>

<div class="absolute w-full h-full flex flex-col">
  <div class="z-10">
    <Header appName="Here"></Header>
  </div>
  <main class="relative h-full overflow-auto">
    {#if errorState.error}
      <div class="h-full flex flex-col gap-2 items-center justify-center">
        <!-- Error: {errorState.error?.message} -->
        ERROR!
      </div>
    {:else}
      {@render children?.()}
    {/if}
  </main>
</div>
