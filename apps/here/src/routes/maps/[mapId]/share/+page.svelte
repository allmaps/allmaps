<script lang="ts">
  import { page } from '$app/state'
  import { fade } from 'svelte/transition'

  import { Dialog } from 'bits-ui'

  import { X as XIcon, ShareNetwork as ShareNetworkIcon } from 'phosphor-svelte'

  import { Loading } from '@allmaps/ui'

  import CopyButton from '$lib/components/CopyButton.svelte'
  // import Colors from '$lib/components/Colors.svelte'

  import { getAllmapsId } from '$lib/shared/ids.js'
  import { createRouteUrl, gotoRoute } from '$lib/shared/router.js'

  import { PUBLIC_PREVIEW_URL } from '$env/static/public'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  let open = $state(true)
  let imageLoaded = $state(false)
  let imageError = $state(false)

  let postcardUrl = $derived(
    `https://next.here.allmaps.org/${getAllmapsId(data.mapId)}/postcard?from=${data.from?.join(',')}`
  )

  let postcardText = $derived(`Look where I am! ${postcardUrl}`)

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
  // Add full text to copy
  // Show map label/description
  // Select color
  // Copy URL
  // Copy image
  // Preview postcard
  // Paste URL in Signal, WhatsApp, Slack, Bluesky
  // Copy buttons only enabled when image loaded and no error
</script>

<div class="absolute top-0 w-full h-full">
  <Dialog.Root bind:open>
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
      <Dialog.Content
        class="rounded-lg bg-white shadow-lg outline-hidden fixed left-[50%] top-[50%] z-50 w-full max-w-[calc(100%-2rem)]
        translate-x-[-50%] translate-y-[-50%] border p-5 sm:max-w-xl md:w-full
        flex flex-col gap-4"
      >
        <Dialog.Title class="w-full flex gap-2 justify-between items-center">
          <div class="flex flex-row gap-2 items-center">
            <ShareNetworkIcon size="24" />
            <span class="text-lg font-semibold"
              >Share your location on this map</span
            >
          </div>

          <Dialog.Close
            class="cursor-pointer justify-self-end p-2 rounded-full hover:bg-gray/10 transition-colors"
          >
            <div>
              <XIcon class="size-6" />
              <span class="sr-only">Close</span>
            </div>
          </Dialog.Close>
        </Dialog.Title>

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
              src="{PUBLIC_PREVIEW_URL}/{getAllmapsId(
                data.mapId
              )}.jpg?from={data.from?.join(',')}"
            />
            {#if !imageLoaded}
              <div
                out:fade
                class="w-full h-full absolute border-2 bg-white border-gray/50 rounded-lg
                top-0 left-0 flex items-center justify-center"
              >
                <Loading />
              </div>
            {/if}
          {/if}
        </div>

        <div
          class="p-4 field-sizing-content resize-none bg-pink/10 rounded-lg
          italic wrap-break-word
          before:content-['“'] after:content-['”']"
        >
          {@html postcardText}
        </div>

        <div class="text-center text-sm">
          Copy the text or URL to send this map with your location to your
          friends using apps like Signal, WhatsApp, Slack, or Bluesky.
        </div>

        <div class="flex flex-row gap-2 items-center justify-end">
          <!-- <Colors /> -->

          <CopyButton
            text={postcardUrl}
            label="Copy URL"
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
            label="Copy text"
            class="disabled:cursor-not-allowed disabled:bg-green/50 bg-green
              active:translate-[1px] hover:translate-[0.5px]
              hover:bg-green/80 select-none
              text-white
              cursor-pointer transition-all px-4 py-2 rounded-lg
              flex flex-row gap-2 items-center"
            disabled={!imageLoaded}
          />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
</div>
