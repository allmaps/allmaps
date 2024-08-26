<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  import { Header, Loading, URLInput, paramStore } from '@allmaps/ui'

  import { Navigation } from '@allmaps/ui/kit'

  import {
    maps,
    loadMapsFromCoordinates,
    loadMapsFromUrl
  } from '$lib/shared/stores/maps.js'
  import { error } from '$lib/shared/stores/error.js'
  import { position } from '$lib/shared/stores/geolocation.js'
  import {
    selectedMapId,
    selectedMapWithImageInfo
  } from '$lib/shared/stores/selected-map.js'

  import Here from '$lib/components/Here.svelte'
  import NearbyMaps from '$lib/components/NearbyMaps.svelte'

  // eslint-disable-next-line no-undef
  async function handleGeolocation(position: GeolocationPosition) {
    loadMapsFromCoordinates(position.coords.latitude, position.coords.longitude)
  }

  $: {
    if ($position) {
      try {
        handleGeolocation($position)
      } catch (err) {
        if (err instanceof Error) {
          $error = err
        } else {
          $error = new Error('Unknown error')
        }
      }
    }
  }

  onMount(async () => {
    paramStore.subscribe(async (value) => {
      if (!value) {
        $selectedMapId = undefined
      } else {
        if (value.type === 'url' && value.urls && value.urls.length > 0) {
          loadMapsFromUrl(value.urls[0])
          $selectedMapId = value.urls[0]
        }
      }
    })
  })
</script>

<Navigation />
<div class="absolute w-full h-full flex flex-col">
  <Header appName="Here">
    {#if $selectedMapId}
      <URLInput />
    {/if}
  </Header>
  <main class="relative h-full overflow-auto">
    {#if $selectedMapWithImageInfo}
      <Here />
    {:else if $maps.size > 0}
      <section class="p-3" transition:fade={{ duration: 120 }}>
        <NearbyMaps />
      </section>
    {:else if $error}
      <div class="h-full flex flex-col gap-2 items-center justify-center">
        Error: {$error.message}
      </div>
    {:else}
      <div class="h-full flex items-center justify-center">
        <Loading />
      </div>
    {/if}
  </main>
</div>
