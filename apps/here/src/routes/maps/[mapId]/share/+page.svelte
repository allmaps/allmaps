<script lang="ts">
  import { fade } from 'svelte/transition'

  import { goto } from '$app/navigation'
  import { page } from '$app/state'

  import { Dialog } from 'bits-ui'

  import {
    X as XIcon,
    Copy as CopyIcon,
    Check as CheckIcon,
    ShareNetwork as ShareNetworkIcon
  } from 'phosphor-svelte'

  import { Loading } from '@allmaps/ui'

  import Colors from '$lib/components/Colors.svelte'

  import { createRouteUrl } from '$lib/shared/router.js'

  import { PUBLIC_PREVIEW_URL } from '$env/static/public'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  let open = $state(true)
  let imageLoaded = $state(false)
  let copying = $state(false)

  let copyTimeout: number | undefined

  let postcardUrl = $derived(
    createRouteUrl(page, `${page.url.pathname}/../postcard`, {
      from: data.from?.join(',')
    })
  )

  $effect(() => {
    if (!open) {
      goto('./')
    }
  })

  function handleImageLoad() {
    imageLoaded = true
  }

  function handleImageError() {
    // TODO: handle image error
  }

  function handleCopy() {
    const absolutePostcardUrl = `https://next.here.allmaps.org/maps/${data.allmapsMapId}/postcard?from=${data.from?.join(',')}`
    navigator.clipboard.writeText(absolutePostcardUrl)

    copying = true

    window.clearTimeout(copyTimeout)
    copyTimeout = window.setTimeout(() => {
      copying = false
    }, 2000)
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
          <img
            onload={handleImageLoad}
            onerror={handleImageError}
            alt="Preview"
            class="rounded-md overflow-hidden"
            src="{PUBLIC_PREVIEW_URL}/maps/{data.allmapsMapId}.jpg?from={data.from?.join(
              ','
            )}"
          />
          {#if !imageLoaded}
            <div
              out:fade
              class="w-full h-full absolute bg-white
                top-0 left-0 flex items-center justify-center"
            >
              <Loading />
            </div>
          {/if}
        </div>

        <div class="p-2 text-center">
          Copy link to send your location on this map to your friends!
        </div>

        <div class="flex flex-row gap-2 items-center justify-between">
          <Colors />
          <button
            class="disabled:cursor-not-allowed disabled:bg-green/50 bg-green
              active:translate-[1px] hover:translate-[0.5px]
              hover:bg-green/80 select-none
              text-white
              cursor-pointer transition-all px-4 py-2 rounded-lg
              flex flex-row gap-2 items-center"
            disabled={!imageLoaded}
            onclick={handleCopy}
          >
            {#if copying}
              <CheckIcon class="size-5" />
            {:else}
              <CopyIcon class="size-5" />
            {/if}
            Copy link</button
          >
        </div>

        <a class="underline bg-orange" href={postcardUrl}>Preview URL</a>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
</div>
