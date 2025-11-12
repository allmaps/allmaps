<script lang="ts">
  import { Dialog } from 'bits-ui'
  import { X as XIcon } from 'phosphor-svelte'

  import type { PopoverContents } from '$lib/shared/types.js'

  type Props = {
    popoverContents?: PopoverContents
  }

  let { popoverContents }: Props = $props()

  let descriptionLines = $derived(popoverContents?.description?.split('\n'))

  let isOpen = $derived(popoverContents !== undefined)

  function closeMarkerDialog() {
    popoverContents = undefined
  }
</script>

{#snippet image(src: string, alt?: string)}
  <img
    class="w-full object-contain rounded-md"
    {src}
    alt={alt || 'Marker image'}
  />
{/snippet}

<Dialog.Root bind:open={() => isOpen, () => closeMarkerDialog()}>
  <Dialog.Portal>
    {#if popoverContents}
      <Dialog.Overlay
        class="h-full animate-fade-in
        fixed inset-0 z-50 bg-black/80"
        onclick={closeMarkerDialog}
      />

      <Dialog.Content
        class="w-full h-full p-5 sm:p-10 md:p-20 lg:px-30 lg:py-20 fixed z-100
          flex items-center justify-center pointer-events-none!"
      >
        <div
          class="bg-white max-w-md max-h-full animate-fade-in
            rounded shadow-lg flex flex-col pointer-events-auto"
        >
          <Dialog.Title
            class="w-full p-4 pb-0 flex gap-2 justify-between items-center"
          >
            <div class="flex flex-row gap-2 items-center">
              {#if popoverContents.title}
                <Dialog.Title class="text-lg font-semibold"
                  >{popoverContents.title}</Dialog.Title
                >
              {/if}
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
          <div class="overflow-auto p-4 space-y-4">
            {#if popoverContents.image}
              {#if popoverContents.url}
                <a href={popoverContents.url} class="inline-block"
                  >{@render image(popoverContents.image)}</a
                >
              {:else}
                {@render image(popoverContents.image)}
              {/if}
            {/if}
            {#if descriptionLines}
              {#each descriptionLines as line (line)}
                <p class="text-sm">
                  {line}
                </p>
              {/each}
            {/if}
          </div>
        </div>
      </Dialog.Content>
    {/if}
  </Dialog.Portal>
</Dialog.Root>
