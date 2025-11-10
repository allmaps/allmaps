<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  import { Footer } from '@allmaps/components'

  import { getUrlState } from '$lib/shared/params.js'

  import {
    gotoRoute,
    getViewUrl,
    getNewParamsFromUrl
  } from '$lib/shared/router.js'

  import Title from '$lib/components/Title.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Organizations from '$lib/components/Organizations.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

  import { organizationsWithCollectionsOnHomepage } from '$lib/shared/organizations.js'

  const urlState = getUrlState()

  function handleInputSubmit(url: string) {
    gotoRoute(
      urlState.generateUrl(getViewUrl('images'), getNewParamsFromUrl(url))
    )
  }

  onMount(() => {
    const hash = page.url.hash
    if (hash) {
      let pathWithSearchParams = hash.slice(1)

      if (pathWithSearchParams.length > 1) {
        // Rewrite hash-based routes from old version
        // of Allmaps Editor

        if (pathWithSearchParams.startsWith('/collection')) {
          pathWithSearchParams = pathWithSearchParams.replace(
            '/collection',
            '/images'
          )
        }

        const newUrl = resolve(`${page.url.origin}${pathWithSearchParams}`)
        goto(newUrl)
      }
    }
  })
</script>

<div class="flex flex-col items-center gap-4">
  <div
    class="absolute top-0 -z-10 flex h-full w-full items-center justify-center overflow-hidden sm:p-8"
  >
    <div
      id="masks"
      class="h-full w-full max-w-5xl scale-120 bg-no-repeat transition-transform sm:scale-150"
    ></div>
  </div>
  <section
    class="my-2 flex w-full max-w-2xl flex-col items-center justify-center gap-6 bg-no-repeat p-4 sm:my-6"
  >
    <div class="flex w-full max-w-md flex-col items-center gap-6">
      <Title />

      <p class="text-center text-black">
        Find a map from a IIIF-enabled map collection, copy its IIIF URL and
        paste it below to start georeferencing. You can view georeferenced maps
        in <a href="https://viewer.allmaps.org" class="underline"
          >Allmaps Viewer</a
        > or use them in tools like MapLibre, OpenLayers, Leaflet or QGIS.
      </p>
      <URLInput onSubmit={handleInputSubmit} />
      <!-- TODO: enable when homepage is updated! -->
      <!-- <p>
        <a
          href="https://dev.allmaps.org/guides/georeferencing/"
          class="inline-block font-bold text-pink text-center hover:underline after:content-['_›']"
          >Learn more about georeferencing IIIF maps</a
        >
      </p> -->
      <p class="text-center text-xs text-gray-600">
        <TermsOfUse />
      </p>
    </div>
  </section>
  <section class="flex w-full flex-col items-center bg-[#f2feff] pb-16">
    <div class="flex max-w-(--breakpoint-lg) flex-col items-center p-2">
      <div class="flex flex-col items-center space-y-4 p-8 text-center">
        <h2 class="text-2xl font-bold text-black">
          Or pick a map from these collections
        </h2>
      </div>
      <Organizations organizations={organizationsWithCollectionsOnHomepage} />
    </div>
  </section>
</div>
<Footer />

<style scoped>
  #masks {
    background-image: url('$lib/images/masks.svg');
    background-position: center 0;
  }
</style>
