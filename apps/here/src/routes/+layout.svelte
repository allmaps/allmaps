<script lang="ts">
  import { onDestroy } from 'svelte'
  import { onNavigate } from '$app/navigation'

  import { Stats } from '@allmaps/ui'

  import Error from '$lib/components/Error.svelte'

  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'
  import { setSensorsState } from '$lib/state/sensors.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setGeocodeState } from '$lib/state/geocode.svelte.js'

  import type { LayoutProps } from './$types.js'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  let { data, children }: LayoutProps = $props()

  const errorState = setErrorState()
  const imageInfoState = setImageInfoState()
  const sensorsState = setSensorsState(errorState)
  const uiState = setUiState()

  // svelte-ignore state_referenced_locally
  setMapsState(
    sensorsState,
    imageInfoState,
    errorState,
    uiState,
    data.env.PUBLIC_ANNOTATIONS_BASE_URL
  )
  // svelte-ignore state_referenced_locally
  setGeocodeState(data.env.PUBLIC_GEOCODE_EARTH_KEY)

  $effect.pre(() => {
    sensorsState.position = data.position
  })

  onNavigate((navigation) => {
    if (!document.startViewTransition) {
      return
    }

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

<Stats statsWebsiteId={data.env.PUBLIC_STATS_WEBSITE_ID} />
<main class="absolute w-full h-dvh flex flex-col">
  {#if errorState.error}
    <Error />
  {:else}
    {@render children?.()}
  {/if}
</main>
