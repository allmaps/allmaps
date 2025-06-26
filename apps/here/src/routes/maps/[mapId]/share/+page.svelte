<script lang="ts">
  import { page } from '$app/state'
  import { fade } from 'svelte/transition'

  import { Dialog } from 'bits-ui'

  import { X as XIcon, Envelope as EnvelopeIcon } from 'phosphor-svelte'

  import { Loading } from '@allmaps/ui'

  import CopyButton from '$lib/components/CopyButton.svelte'
  // import Colors from '$lib/components/Colors.svelte'

  import { getIiifState } from '$lib/state/iiif.svelte.js'
  import { getGeocodeState } from '$lib/state/geocode.svelte.js'

  import { getAllmapsId } from '$lib/shared/ids.js'
  import { createRouteUrl, gotoRoute } from '$lib/shared/router.js'

  import { env } from '$env/dynamic/public'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  const iiifState = getIiifState()
  const geocodeState = getGeocodeState()

  let open = $state(true)
  let imageLoaded = $state(false)
  let imageError = $state(false)

  let locality = $derived(geocodeState.getReverseGeocode(data.from))
  let year = $derived(iiifState.year)

  let postcardUrl = $derived(
    `${page.url.origin}/${getAllmapsId(data.mapId)}/postcard?from=${data.from?.join(',')}`
  )

  // let displayPostcardUrl = $derived(
  //   `${page.url.origin}/&ZeroWidthSpace;${getAllmapsId(data.mapId)}/&ZeroWidthSpace;postcard?from=${data.from?.join(',')}`
  // )

  let postcardText = $derived(getPostcardText(postcardUrl))
  let displayPostcardText = $derived(getPostcardText())

  function getPostcardText(postcardUrl?: string) {
    return `Look where I am on this map${locality ? ` of ${locality}` : ''}${year ? ` from ${year}` : ''}! Where are you?${postcardUrl ? ` ${postcardUrl}` : ''}`
  }

  $effect(() => {
    iiifState.manifestIds.forEach((id) => {
      iiifState.fetchManifest(id)
    })
  })

  $effect(() => {
    if (data.from) {
      geocodeState.fetchReverseGeocode(data.from)
    }
  })

  $effect(() => {
    if (!open) {
      gotoRoute(
        createRouteUrl(page, `${getAllmapsId(data.mapId)}`, { from: null })
      )
    }
  })

  function handleImageLoad() {
    imageLoaded = true
  }

  function handleImageError() {
    imageError = true
  }

  // TODO:
  // - Select color
</script>

<div class="absolute top-0 w-full h-full">
  <Dialog.Root bind:open>
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
      <Dialog.Content
        class="rounded-lg bg-white shadow-lg outline-hidden fixed left-[50%] top-[50%] z-50 w-full max-w-[calc(100%-2rem)]
        translate-x-[-50%] translate-y-[-50%] border p-4 sm:max-w-xl md:w-full
        flex flex-col gap-4 items-center"
      >
        <Dialog.Title class="w-full flex gap-2 justify-between items-center">
          <div class="flex flex-row gap-2 items-center">
            <EnvelopeIcon size="24" />
            <span class="text-lg font-semibold"
              >Share your location <span class="hidden sm:inline"
                >with this postcard</span
              ></span
            >
          </div>

          <Dialog.Close
            class="cursor-pointer justify-self-end p-1 rounded-full hover:bg-gray/10 transition-colors"
          >
            <div>
              <XIcon class="size-6" />
              <span class="sr-only">Close</span>
            </div>
          </Dialog.Close>
        </Dialog.Title>

        <div class="w-full bg-pink/10 p-3 rounded-xl flex flex-col gap-4">
          <div
            class="w-full relative"
            style="aspect-ratio: {OG_IMAGE_SIZE.width / OG_IMAGE_SIZE.height}"
          >
            {#if imageError}
              <div
                class="bg-red w-full h-full p-4
                flex items-center justify-center rounded-lg text-white"
              >
                <div class="text-center">
                  Error loading preview image. This map cannot be shared.
                </div>
              </div>
            {:else}
              <img
                onload={handleImageLoad}
                onerror={handleImageError}
                alt="Preview"
                class="rounded-md overflow-hidden"
                src="{env.PUBLIC_PREVIEW_URL}/{getAllmapsId(
                  data.mapId
                )}.jpg?from={data.from?.join(',')}"
              />
              {#if !imageLoaded}
                <div
                  out:fade
                  class="w-full h-full absolute border-2 bg-white border-pink/50 rounded-lg
                top-0 left-0 flex items-center justify-center"
                >
                  <Loading />
                </div>
              {/if}
            {/if}
          </div>

          <div
            class="flex flex-row py-2 relative items-center justify-end z-0 drop-shadow-lg"
          >
            <div
              class="bg-white p-4 flex flex-col gap-2 max-w-xs
              field-sizing-content resize-none rounded-lg text-sm
                wrap-break-word inset-shadow text-pink"
            >
              <p>
                {@html displayPostcardText}
              </p>
              <p class="uppercase text-gray-300 text-xs">Now</p>
            </div>
            <span class="text-white grow-0 -z-10"
              ><svg
                viewBox="0 0 30 10"
                preserveAspectRatio="none"
                data-arrow=""
                width="16"
                height="16"
                ><polygon points="0,0 0,30 30,10" fill="currentColor"
                ></polygon></svg
              ></span
            >
          </div>
        </div>

        <div class="text-center text-sm text-gray-600 max-w-md">
          Copy the message or the link to send this postcard to your friends
          using apps like Signal, Slack, or Bluesky.
        </div>

        <div class="flex flex-row gap-2 items-center justify-end self-end">
          <!-- <Colors /> -->

          <CopyButton
            text={postcardUrl}
            label="Copy link only"
            link={true}
            class="disabled:cursor-not-allowed disabled:text-gray
              active:translate-[1px] hover:translate-[0.5px]
              hover:bg-gray/20 select-none
              text-sm
              cursor-pointer transition-all px-4 py-2 rounded-lg
              flex flex-row gap-2 items-center"
            disabled={!imageLoaded}
          />
          <CopyButton
            text={postcardText}
            label="Copy message"
            class="disabled:cursor-not-allowed disabled:bg-pink/50 bg-pink
              active:translate-[1px] hover:translate-[0.5px] shadow-none hover:shadow-lg
              hover:bg-pink-100 select-none
              text-white hover:text-pink
              cursor-pointer transition-all px-4 py-2 rounded-lg
              flex flex-row gap-2 items-center"
            disabled={!imageLoaded}
          />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
</div>
