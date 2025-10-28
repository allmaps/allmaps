<script lang="ts">
  import { Dialog } from 'bits-ui'

  import { X as XIcon } from 'phosphor-svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    title?: Snippet
    overlay?: Snippet
    open: boolean
    closeButton?: boolean
    children: Snippet
  } & Record<string, unknown>

  let {
    title,
    overlay,
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
      class="absolute z-50
      inset-0 bg-black/90
      data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
    />
    <!-- The regular onclick handler of the overlay doesn't seem to work well,
      maybe this will be better in a new version of bits-ui -->
    <Dialog.Content
      class="fixed flex items-center justify-center w-full h-full p-4 md:p-16 z-[51]"
      onmousedown={handleContentClick}
    >
      {#if overlay}
        <div class="absolute top-0 w-full h-full pointer-events-none">
          {@render overlay()}
        </div>
      {/if}
      <div
        class="rounded-lg max-w-full max-h-full
        bg-white shadow-lg outline-none border-gray-100
          inset-shadow-sm
          flex flex-col z-[52]
          p-2 sm:p-4 gap-2 sm:gap-4"
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
        <div class="overflow-auto rounded-md">
          <section {...restProps}>
            {@render children()}
          </section>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
