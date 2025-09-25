<script lang="ts">
  import { Dialog } from 'bits-ui'

  import { X as XIcon } from 'phosphor-svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    title: Snippet
    open: boolean
    closeButton?: boolean
    children: Snippet
  } & Record<string, unknown>

  let {
    title,
    open = $bindable(false),
    children,
    ...restProps
  }: Props = $props()

  function handleContentClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      open = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed
      inset-0 z-[100] bg-black/90 p-4
      data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
    />
    <!-- The regular onclick handler of the overlay doesn't seem to work well,
      maybe this will be better in a new version of bits-ui -->
    <Dialog.Content
      class="isolate fixed flex items-center justify-center w-full h-full z-[150] p-4 sm:p-8 md:p-16"
      onmousedown={handleContentClick}
    >
      <div
        class="rounded-lg z-50 max-w-full max-h-full
        bg-white shadow-lg outline-none border-gray-100
          p-2 sm:p-4 flex flex-col gap-2 sm:gap-4"
      >
        {#if title}
          <div class="flex items-start sm:items-center justify-between">
            <h3 class="text-xl font-medium">{@render title()}</h3>
            <Dialog.Close
              class="cursor-pointer rounded-full p-1 bg-white hover:bg-gray-100/80 transition-colors duration-200"
            >
              <span class="sr-only">Close</span>
              <XIcon class="size-5" size="100%" weight="bold" />
            </Dialog.Close>
          </div>
        {/if}
        <div class="overflow-auto">
          <section {...restProps}>
            {@render children()}
          </section>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
