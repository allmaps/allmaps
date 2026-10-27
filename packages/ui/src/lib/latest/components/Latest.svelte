<script lang="ts">
  import { onMount } from 'svelte'

  import Collection from '$lib/components/Collection.svelte'

  import Header from '$lib/latest/components/Header.svelte'
  import Loading from '$lib/latest/components/Loading.svelte'
  import Items from '$lib/latest/components/Items.svelte'

  import { setUiState } from '$lib/latest/state/ui.svelte.js'

  type Props = {
    count?: number
    showHeader?: boolean
    showProperties?: boolean
    showUrls?: boolean
  }

  let {
    count = 100,
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
    const mapsUrl = `https://api.allmaps.org/maps?limit=${count}`

    try {
      const response = await fetch(mapsUrl, { credentials: 'include' })
      apiMaps = await response.json()

      if (!Array.isArray(apiMaps)) {
        throw new Error('Invalid response')
      }
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
    <Header />
  {/if}
  {#if uiState.loading}
    <Loading {count} />
  {:else}
    <Items {apiMaps} {showProperties} {showUrls} />
  {/if}
</Collection>
