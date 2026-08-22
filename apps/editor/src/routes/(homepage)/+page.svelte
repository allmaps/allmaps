<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'

  import { Footer } from '@allmaps/ui'

  import { getUrlState } from '$lib/shared/params.js'
  import { setHomepageExamplesData } from '$lib/shared/homepage-examples-cache.js'

  import {
    gotoRoute,
    getViewUrl,
    getNewParamsFromUrl
  } from '$lib/shared/router.js'

  import Title from '$lib/components/Title.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Organizations from '$lib/components/Organizations.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

  import { m } from '$lib/paraglide/messages.js'

  let { data } = $props()

  const urlState = getUrlState()

  function handleInputSubmit(url: string) {
    gotoRoute(
      urlState.generateUrl(getViewUrl('images'), getNewParamsFromUrl(url))
    )
  }

  onMount(() => {
    if (data.examplesLoaded) {
      setHomepageExamplesData(data)
    }

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

        goto(`${page.url.origin}${pathWithSearchParams}`)
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
        {m.homepage_intro()}
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
          {m.homepage_pick_collection()}
        </h2>
      </div>
      <Organizations
        organizations={data.organizations}
        examplesByOrganizationId={data.examplesByOrganizationId}
        visibleOrganizationCount={data.visibleOrganizationCount}
      />
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
