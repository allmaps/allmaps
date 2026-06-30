<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/state'
  import { onNavigate, afterNavigate } from '$app/navigation'

  import { setUrlState } from '$lib/state/url.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'

  import { searchParams } from '$lib/shared/params.js'

  import Header from '$lib/components/app/Header.svelte'
  import Modals from '$lib/components/app/Modals.svelte'
  import RootHead from '$lib/components/app/RootHead.svelte'
  import View from '$lib/components/app/View.svelte'

  import type { LayoutProps } from './$types'

  import './layout.css'
  import '@allmaps/ui/css/fonts.css'

  let { data, children }: LayoutProps = $props()

  const urlState = setUrlState(page.url, searchParams)
  setUiState()

  let currentUrlParam = $state<string | undefined>(urlState.params.url)

  onNavigate((navigation) => {
    if (!document.startViewTransition) {
      return
    }

    const toUrlParam = navigation.to?.url.searchParams.get('url') || undefined
    const shouldTransition = currentUrlParam !== toUrlParam

    if (!shouldTransition) {
      return
    }

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  afterNavigate(() => {
    urlState.updateUrl(page.url)
    currentUrlParam = urlState.params.url
  })
</script>

<RootHead />

{#if page.error}
  <View>
    {#snippet header()}
      <Header appName="Viewer" />
    {/snippet}

    {@render children()}
  </View>
{:else}
  {@render children()}
{/if}

{#if browser}
  <Modals
    mapsApiBaseUrl={data.env.PUBLIC_REST_BASE_URL}
    annotationsApiBaseUrl={data.env.PUBLIC_ANNOTATIONS_BASE_URL}
    viewerBaseUrl={data.env.PUBLIC_VIEWER_BASE_URL}
    showAttributionFallback={!!page.error}
  />
{/if}
