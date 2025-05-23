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

  import { PUBLIC_PREVIEW_URL } from '$env/static/public'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

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

  let { data, children }: LayoutProps & Props = $props()

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

<svelte:head>
  <title>Allmaps Here</title>
  <meta name="title" content="Allmaps Here" />
  <meta property="og:title" content="Look where I am on this map!" />
  <meta
    name="description"
    content="Visit Allmaps Here and find out where you are on digitized maps from your area."
  />
  <meta
    property="og:description"
    content="Visit Allmaps Here and find out where you are on digitized maps from your area."
  />

  {#if data.allmapsMapId && data.from}
    <meta
      property="og:image"
      content="{PUBLIC_PREVIEW_URL}/maps/{data.allmapsMapId}.jpg?from={data.from.join(
        ','
      )}"
    />
    <meta property="og:image:width" content={String(OG_IMAGE_SIZE.width)} />
    <meta property="og:image:height" content={String(OG_IMAGE_SIZE.height)} />
  {/if}

  <meta property="og:url" content={page.url.href} />
  <meta property="og:site_name" content="Allmaps Here" />
  <meta property="og:locale" content="en" />
  <meta property="og:type" content="website" />
</svelte:head>

<main class="absolute w-full h-full flex flex-col">
  {#if errorState.error}
    <Error />
  {:else}
    {@render children?.()}
  {/if}
</main>
