<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'

  import { browser } from '$app/environment'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router'
  import { getUrlState } from '$lib/state/url.svelte.js'

  import URLInput from '$lib/components/URLInput.svelte'
  import Organizations from '$lib/components/Organizations.svelte'

  import masks from '$lib/images/masks.svg'

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
    gotoRoute(createRouteUrl($page, 'images', { url }))
  }

  onMount(() => {
    autofocus = !hasTouch()

    const hash = $page.url.hash
    if (hash) {
      const pathWithSearchParams = hash.slice(1)
      if (pathWithSearchParams.length > 1) {
        if (pathWithSearchParams.startsWith('/collection')) {
          pathWithSearchParams.replace('/collection', '/images')
        }

        const newUrl = `${$page.url.origin}${pathWithSearchParams}`
        goto(newUrl)
      }
    }
  })
</script>

<div class="*:p-4 flex flex-col items-center gap-4">
  <section
    class="max-w-2xl w-full flex flex-col p-4 gap-6 items-center justify-end aspect-[715/387] bg-cover my-2 sm:my-12 bg-center"
    style:background-image="url({masks})"
  >
    <div class="max-w-sm w-full flex flex-col gap-6 items-center mt-24">
      <h1 class="text-2xl sm:text-4xl font-bold text-black text-center">
        Start georeferencing
      </h1>

      <p class="text-black text-center">
        Allmaps Editor is an easy-to-use app for georeferencing IIIF maps
      </p>
      <URLInput onSubmit={handleInputSubmit} {urlState} {autofocus} />
      <p>
        <a
          href="https://dev.allmaps.org/guides/georeferencing/"
          class="inline-block font-bold text-pink text-center hover:underline after:content-['_›']"
          >Learn more about georeferencing IIIF maps</a
        >
      </p>
    </div>
  </section>
  <section class="w-full bg-[#f2feff] flex flex-col items-center">
    <div class="max-w-screen-lg flex flex-col items-center">
      <div
        class="flex flex-col items-center max-w-sm p-8 space-y-4 text-center"
      >
        <h2 class="text-black text-2xl font-bold">Get started</h2>
        <p class="text-gray-600">
          Start georeferencing maps from these collections
        </p>
      </div>
      <Organizations {organizations} />
    </div>
  </section>
</div>
