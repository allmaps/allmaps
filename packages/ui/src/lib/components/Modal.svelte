<script lang="ts">
  import { fade } from 'svelte/transition'

  import XIcon from 'phosphor-svelte/lib/XIcon'

  import type { Snippet } from 'svelte'

  type Props = {
    open: boolean
    returnFocus?: HTMLElement | null
    'aria-describedby'?: string
    title?: Snippet
    closeButtonInTitle?: boolean
    background?: Snippet
    children: Snippet
  }

  const titleId = $props.id()
  let dialog = $state<HTMLDialogElement>()

  let {
    open = $bindable(false),
    returnFocus,
    'aria-describedby': describedBy,
    title,
    closeButtonInTitle = true,
    background,
    children
  }: Props = $props()

  function handleClose() {
    open = false
    if (returnFocus?.isConnected) returnFocus.focus()
  }

  function handleMousedown(event: MouseEvent) {
    if (event.target === dialog) {
      event.preventDefault()
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
    aria-describedby={describedBy}
    aria-labelledby={title ? titleId : undefined}
    class="fixed inset-0 m-0 box-border h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden border-0 bg-transparent p-0 backdrop:bg-black/40 open:pointer-events-auto open:flex"
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
        box-border rounded-lg bg-white p-2 text-black shadow-lg outline-none sm:gap-4 sm:p-4 md:m-16 md:max-h-[calc(100%-8rem)] md:max-w-[calc(100%-8rem)]"
    >
      {#if title}
        <div class="flex shrink-0 items-center justify-between gap-2">
          <h2 id={titleId} class="m-0 min-w-0 text-xl font-medium">
            {@render title()}
          </h2>
          {#if closeButtonInTitle}
            <button
              type="button"
              onclick={() => (open = false)}
              class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-white p-0 text-inherit transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span class="sr-only">Close</span>
              <XIcon class="size-5" size="100%" weight="bold" />
            </button>
          {/if}
        </div>
      {/if}
      <div class="min-h-0 min-w-0 overflow-auto overscroll-contain">
        {@render children?.()}
      </div>
    </div>
  </dialog>
{/if}
