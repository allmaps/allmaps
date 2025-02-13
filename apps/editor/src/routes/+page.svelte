<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { browser } from '$app/environment'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router'
  import { getUrlState } from '$lib/state/url.svelte.js'

  import Title from '$lib/components/Title.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Organizations from '$lib/components/Organizations.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'
  import Footer from '$lib/components/Footer.svelte'

  import organizations from '$lib/shared/organizations.js'

  let autofocus = $state(false)

  let urlState = getUrlState()

  function hasTouch() {
    if (browser) {
      // See:
      //  - https://css-tricks.com/touch-devices-not-judged-size/
      //  - https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
      return window.matchMedia('(pointer: coarse)').matches
    }

    return false
  }

  $effect.pre(() => {
    autofocus = !hasTouch()
  })

  function handleInputSubmit(url: string) {
    gotoRoute(createRouteUrl(page, 'images', { url }))
  }

  onMount(() => {
    autofocus = !hasTouch()

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

        const newUrl = `${page.url.origin}${pathWithSearchParams}`
        goto(newUrl)
      }
    }
  })
</script>

<div class="flex flex-col items-center gap-4">
  <div
    class="absolute -z-10 top-0 w-full h-full overflow-hidden flex justify-center items-center sm:p-8"
  >
    <div
      id="masks"
      class="bg-no-repeat w-full max-w-5xl h-full scale-120 sm:scale-150 transition-transform"
    ></div>
  </div>
  <section
    class="max-w-2xl w-full flex flex-col p-4 gap-6 items-center justify-center bg-no-repeat my-2 sm:my-6"
  >
    <div class="max-w-md w-full flex flex-col gap-6 items-center">
      <Title />

      <p class="text-black text-center">
        Find a map from a IIIF-enabled map collection, copy its IIIF URL and
        paste it below to start georeferencing. You can view georeferenced maps
        in <a href="https://viewer.allmaps.org" class="underline"
          >Allmaps Viewer</a
        > or use them in tools like MapLibre, OpenLayers, Leaflet or QGIS.
      </p>
      <URLInput onSubmit={handleInputSubmit} {urlState} {autofocus} />
      <!-- TODO: enable when homepage is updated! -->
      <!-- <p>
        <a
          href="https://dev.allmaps.org/guides/georeferencing/"
          class="inline-block font-bold text-pink text-center hover:underline after:content-['_›']"
          >Learn more about georeferencing IIIF maps</a
        >
      </p> -->
      <p class="text-xs text-center text-gray-600">
        <TermsOfUse />
      </p>
    </div>
  </section>
  <section class="w-full bg-[#f2feff] flex flex-col items-center pb-16">
    <div class="max-w-(--breakpoint-lg) flex flex-col items-center p-2">
      <div class="flex flex-col items-center p-8 space-y-4 text-center">
        <h2 class="text-black text-2xl font-bold">
          Or pick a map from these collections
        </h2>
      </div>
      <Organizations {organizations} />
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
