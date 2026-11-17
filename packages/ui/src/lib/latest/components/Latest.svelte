<script lang="ts">
  import { onMount } from 'svelte'

  import Collection from '$lib/components/Collection.svelte'

  import Header from '$lib/latest/components/Header.svelte'
  import Loading from '$lib/latest/components/Loading.svelte'
  import Items from '$lib/latest/components/Items.svelte'

  import { setUiState } from '$lib/latest/state/ui.svelte.js'
  import { fetchLatestMaps } from '$lib/latest/shared/fetch.js'

  type Props = {
    count?: number
    mapsApiBaseUrl?: string
    annotationsApiBaseUrl?: string
    organizationSlug?: string
    organizationName?: string
    showHeader?: boolean
    showProperties?: boolean
    showUrls?: boolean
  }

  let {
    count = 100,
    mapsApiBaseUrl = 'https://api.allmaps.org',
    annotationsApiBaseUrl = 'https://annotations.allmaps.org',
    organizationSlug,
    organizationName,
    showHeader = false,
    showProperties = true,
    showUrls = true
  }: Props = $props()

  const uiState = setUiState()

  let apiMaps: unknown[] = $state([])

  // Add config:
  // - switch between resource mask and geo mask
  // - sort!
  // - hide errors

  onMount(async () => {
    try {
      apiMaps = await fetchLatestMaps({
        count,
        mapsApiBaseUrl,
        annotationsApiBaseUrl,
        organizationSlug
      })
    } catch (err) {
      // TODO: create Error component
      console.error(err)
    } finally {
      uiState.loading = false
    }
  })
</script>

<Collection>
  {#if showHeader}
    <Header {organizationName} />
  {/if}
  {#if uiState.loading}
    <Loading {count} />
  {:else}
    <Items {apiMaps} {showProperties} {showUrls} />
  {/if}
</Collection>
