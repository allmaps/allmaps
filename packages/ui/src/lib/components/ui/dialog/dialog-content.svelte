<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { DialogContent, DialogClose } from '@ui-sdk/svelte/dialog'
  import DialogPortal from '../popup-portal.svelte'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { Snippet } from 'svelte'
  import * as Dialog from './index.js'
  import { cn } from '../utils.js'
  import type { WithoutChildrenOrChild } from '../types.js'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    stickyHeader,
    showCloseButton = true,
    ...restProps
  }: ComponentProps<typeof DialogContent> & { ref?: HTMLDivElement | null } & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>
    children: Snippet
    stickyHeader?: Snippet
    showCloseButton?: boolean
  } = $props()
</script>

{#snippet closeButton(pinned: boolean)}
  <DialogClose
    class={cn(
      'absolute end-5 grid size-8 cursor-pointer appearance-none place-items-center rounded-full border-0 bg-transparent p-0 text-inherit transition-colors delay-0 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none',
      pinned ? 'top-1/2 -translate-y-1/2' : 'top-5'
    )}
  >
    <XIcon aria-hidden="true" class="size-5" weight="bold" />
    <span class="sr-only">Close</span>
  </DialogClose>
{/snippet}

<DialogPortal disabled={!portalProps} {...portalProps}>
  <Dialog.Overlay />
  <DialogContent
    {@attach elementRef<HTMLDivElement>(
      () => ref,
      (node) => (ref = node)
    )}
    class={cn(
      'bg-background data-open:animate-in data-ending-style:animate-out data-ending-style:fade-out-0 data-open:fade-in-0 data-ending-style:zoom-out-95 data-open:zoom-in-95 fixed inset-0 m-auto h-fit z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border-0 p-6 shadow-lg outline-none duration-200 sm:max-w-lg',
      stickyHeader &&
        'block max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-0',
      className
    )}
    {...restProps}
  >
    {#if stickyHeader}
      <Dialog.Header class="sticky top-0 z-10 bg-background px-6 py-5">
        <div class={showCloseButton ? 'px-8 sm:ps-0' : undefined}>
          {@render stickyHeader()}
        </div>
        {#if showCloseButton}{@render closeButton(true)}{/if}
      </Dialog.Header>
      <div class="grid gap-4 px-6 pb-6">{@render children()}</div>
    {:else}
      {@render children()}
      {#if showCloseButton}{@render closeButton(false)}{/if}
    {/if}
  </DialogContent>
</DialogPortal>
