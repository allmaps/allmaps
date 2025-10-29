<script lang="ts">
  import { fade } from 'svelte/transition'

  import { X as XIcon } from 'phosphor-svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    open: boolean
    title?: Snippet
    closeButtonInTitle?: boolean
    background?: Snippet
    children: Snippet
  }

  let dialog = $state<HTMLDialogElement>()

  let {
    open = $bindable(false),
    title,
    closeButtonInTitle = true,
    background,
    children
  }: Props = $props()

  function handleClose() {
    open = false
  }

  function handleMousedown(event: MouseEvent) {
    if (event.target === dialog) {
      open = false
    }
  }

  $effect(() => {
    if (dialog) {
      if (open) {
        dialog.showModal()
      } else {
        dialog.close()
      }
    }
  })
</script>

{#if open}
  <dialog
    transition:fade={{ duration: 100 }}
    bind:this={dialog}
    class="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out h-full max-h-full w-full max-w-full items-center justify-center bg-transparent
    backdrop:bg-black/90 open:flex"
    onclose={handleClose}
    onmousedown={handleMousedown}
  >
    {#if background && open}
      <div
        class="pointer-events-none fixed inset-0 flex items-center justify-center"
      >
        {@render background()}
      </div>
    {/if}
    <div
      class="absolute m-4 flex max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-2
          rounded-lg bg-white p-2 shadow-lg outline-none sm:gap-4 sm:p-4 md:m-16 md:max-h-[calc(100%-8rem)] md:max-w-[calc(100%-8rem)]"
    >
      {#if title}
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-medium">{@render title()}</h3>
          {#if closeButtonInTitle}
            <button
              onclick={() => (open = false)}
              class="cursor-pointer rounded-full bg-white p-1 transition-colors duration-200 hover:bg-gray-100/80"
            >
              <span class="sr-only">Close</span>
              <XIcon class="size-5" size="100%" weight="bold" />
            </button>
          {/if}
        </div>
      {/if}

      {@render children?.()}
    </div>
  </dialog>
{/if}
