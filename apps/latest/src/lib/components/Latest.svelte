<script lang="ts">
  import { onMount } from 'svelte'

  import { Collection } from '@allmaps/ui'

  import Header from '$lib/components/Header.svelte'
  import Loading from '$lib/components/Loading.svelte'
  import Items from '$lib/components/Items.svelte'

  import { setUiState } from '$lib/state/ui.svelte.js'

  type Props = {
    count?: number
    showHeader?: boolean
    showProperties?: boolean
    showUrls?: boolean
    minItemWidth?: number
  }

  let {
    count = 100,
    showHeader = false,
    showProperties = true,
    showUrls = true,
    minItemWidth
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
      const response = await fetch(mapsUrl)
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

<Collection {minItemWidth}>
  {#if showHeader}
    <Header />
  {/if}
  {#if uiState.loading}
    <Loading {count} />
  {:else}
    <Items {apiMaps} {showProperties} {showUrls} />
  {/if}
</Collection>
