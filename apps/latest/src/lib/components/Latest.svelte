<script lang="ts">
  import { onMount } from 'svelte'

  import { Collection } from '@allmaps/ui'

  import Header from '$lib/components/Header.svelte'
  import Loading from '$lib/components/Loading.svelte'
  import Items from '$lib/components/Items.svelte'

  import { loading } from '$lib/shared/stores/loading.js'

  export let count = 100
  export let showHeader = false
  export let showProperties = true
  export let showUrls = true

  let apiMaps: unknown[] = []

  // Add config:
  // - switch between resource mask and geo mask
  // - sort!
  // - hide errors
  //

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
      $loading = false
    }
  })
</script>

<Collection>
  {#if showHeader}
    <Header />
  {/if}
  {#if $loading}
    <Loading {count} />
  {:else}
    <Items {apiMaps} {showProperties} {showUrls} />
  {/if}
</Collection>
