<script lang="ts">
  import { fade } from 'svelte/transition'

  import { goto } from '$app/navigation'
  import { page } from '$app/state'

  import { Dialog } from 'bits-ui'

  import { X as XIcon } from 'phosphor-svelte'

  import { Loading } from '@allmaps/ui'

  import Colors from '$lib/components/Colors.svelte'

  import { createRouteUrl } from '$lib/shared/router.js'

  import { PUBLIC_PREVIEW_URL } from '$env/static/public'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  let open = $state(true)
  let imageLoaded = $state(false)

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
        <Dialog.Title
          class="flex w-full items-center justify-center text-lg font-semibold tracking-tight"
        >
          Share map
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

        <Colors />

        <div class="flex flex-row gap-2 items-center">
          <button
            class="disabled:cursor-not-allowed disabled:bg-green/50 bg-green
              shadow-lg hover:shadow-sm text-white
              cursor-pointer transition-all px-4 py-2 rounded-full"
            disabled={!imageLoaded}
            onclick={handleCopy}>Copy to clipboard</button
          >
          <a class="underline" href={postcardUrl}>Preview URL</a>
        </div>
        <div>
          Copy to clipboard send your location to your friends using Signal,
          WhatsApp, Slack, Bluesky or any other app!
        </div>

        <Dialog.Close
          class="focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden absolute right-5 top-5 rounded-md
          cursor-pointer
          focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <div>
            <XIcon class="text-foreground size-5" />
            <span class="sr-only">Close</span>
          </div>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
</div>
