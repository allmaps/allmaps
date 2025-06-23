<script lang="ts">
  import { onDestroy } from 'svelte'
  import { onNavigate } from '$app/navigation'

  import { Stats } from '@allmaps/ui'

  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'
  import { setSensorsState } from '$lib/state/sensors.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setGeocodeState } from '$lib/state/geocode.svelte.js'

  import type { Snippet } from 'svelte'

  import type { LayoutProps } from './$types.js'

  import Error from '$lib/components/Error.svelte'

  import { PUBLIC_STATS_WEBSITE_ID } from '$env/static/public'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  type Props = {
    children?: Snippet
  }

  let { data, children }: LayoutProps & Props = $props()

  const errorState = setErrorState()
  const imageInfoState = setImageInfoState()
  const sensorsState = setSensorsState(errorState)

  setMapsState(sensorsState, imageInfoState, errorState)
  setUiState()
  setGeocodeState(data.geocodeEarthKey)

  $effect.pre(() => {
    sensorsState.position = data.position
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

<Stats statsWebsiteId={PUBLIC_STATS_WEBSITE_ID} />
<main class="absolute w-full h-full flex flex-col">
  {#if errorState.error}
    <Error />
  {:else}
    {@render children?.()}
  {/if}
</main>
