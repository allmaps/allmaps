<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

  import { fetchJson, fetchImageInfo } from '@allmaps/stdlib'
  import { parseAnnotation } from '@allmaps/annotation'

  import { Header, Loading, URLInput, paramStore } from '@allmaps/ui'

  import { Navigation } from '@allmaps/ui/kit'

  import { position } from '$lib/shared/stores/geolocation.js'
  import { map } from '$lib/shared/stores/maps.js'
  import { imageInfo } from '$lib/shared/stores/image-info.js'

  import Here from '$lib/components/Here.svelte'

  let initialized = false
  let showForm = false
  let error: Error | null

  function resetForm() {
    $map = undefined
    $imageInfo = undefined

    error = null
    showForm = true
  }

  $: {
    if ($position) {
      // call API to get maps at position
    }
  }

  onMount(async () => {
    paramStore.subscribe(async (value) => {
      initialized = true
      if (!value) {
        resetForm()
      } else {
        showForm = false

        try {
          if (value.type === 'url' && value.url) {
            const annotation = await fetchJson(value.url)
            const maps = parseAnnotation(annotation)

            $map = maps[0]
            $imageInfo = (await fetchImageInfo(
              $map.image.uri
            )) as ImageInformationResponse
          }
        } catch (err) {
          if (err instanceof Error) {
            error = err
          }
        }
      }
    })
  })
</script>

<Navigation />
<div class="absolute w-full h-full flex flex-col">
  <div class="z-10">
    <Header appName="Here">
      {#if !showForm && initialized}
        <URLInput />
      {/if}
    </Header>
  </div>
  <main class="relative h-full overflow-hidden">
    {#if showForm}
      <div class="h-full flex overflow-y-auto">
        <div
          class="container mx-auto mt-10 p-2"
          transition:fade={{ duration: 120 }}
        >
          <p class="mb-3">
            Open a IIIF Resource or Georeference Annotation from a URL:
          </p>
          <URLInput />
        </div>
      </div>
    {:else if $map && $imageInfo}
      <Here />
    {:else if error}
      <div class="h-full flex flex-col gap-2 items-center justify-center">
        Error: {error.message}
        <!-- <ErrorElement {error} /> -->
      </div>
    {:else if initialized}
      <div class="h-full flex items-center justify-center">
        <Loading />
      </div>
    {/if}
  </main>
</div>
