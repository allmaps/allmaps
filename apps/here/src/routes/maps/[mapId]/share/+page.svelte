<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'

  import { Dialog } from 'bits-ui'

  import { X as XIcon } from 'phosphor-svelte'

  import Colors from '$lib/components/Colors.svelte'

  import { createRouteUrl } from '$lib/shared/router.js'

  import { PUBLIC_PREVIEW_URL } from '$env/static/public'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  const ogImageSize = { width: 1200, height: 630 }

  let open = $state(true)

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

  // TODO:
  // Add full text to copy
  // Show map label/description
  // Select color
  // Copy URL
  // Copy image
  // Preview postcard
  // Paste URL in Signal, WhatsApp, Slack, Bluesky
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

        <div style="aspect-ratio: {ogImageSize.width / ogImageSize.height}">
          <img
            alt="Preview"
            class="rounded-md overflow-hidden"
            src="{PUBLIC_PREVIEW_URL}/maps/{data.allmapsMapId}.png?from={data.from?.join(
              ','
            )}"
          />
        </div>

        <Colors />

        <Dialog.Close
          class="focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden absolute right-5 top-5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
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
