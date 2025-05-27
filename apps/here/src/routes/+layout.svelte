<script lang="ts">
  import { onDestroy } from 'svelte'
  import { page } from '$app/state'
  import { onNavigate, afterNavigate } from '$app/navigation'

  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'
  import { setSensorsState } from '$lib/state/sensors.svelte.js'
  import { setUrlState } from '$lib/state/url.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'

  import type { Snippet } from 'svelte'

  import type { LayoutProps } from './$types.js'

  import Error from '$lib/components/Error.svelte'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  const errorState = setErrorState()
  const imageInfoState = setImageInfoState()
  const sensorsState = setSensorsState(errorState)
  const urlState = setUrlState(page.url, errorState)

  setMapsState(sensorsState, imageInfoState, errorState)
  setUiState()

  interface Props {
    children?: Snippet
  }

  let { children }: LayoutProps & Props = $props()

  afterNavigate(() => {
    urlState.updateUrl(page.url)
  })

  onNavigate((navigation) => {
    if (!document.startViewTransition) return

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  onDestroy(() => {
    sensorsState.destroy()
  })
</script>

<main class="absolute w-full h-full flex flex-col">
  {#if errorState.error}
    <Error />
  {:else}
    {@render children?.()}
  {/if}
</main>
