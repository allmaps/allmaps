<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { DialogContent, DialogClose } from '@ui-sdk/svelte/dialog'
  import { getDialogEntered } from './dialog.svelte'
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
    backdrop,
    background,
    portalProps,
    children,
    stickyHeader,
    showCloseButton = true,
    ...restProps
  }: ComponentProps<typeof DialogContent> & { ref?: HTMLDivElement | null } & {
    backdrop?: ComponentProps<typeof Dialog.Overlay>['variant']
    background?: Snippet
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>
    children: Snippet
    stickyHeader?: Snippet
    showCloseButton?: boolean
  } = $props()

  const entered = getDialogEntered()
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
  <Dialog.Overlay variant={backdrop}>
    {#snippet children()}
      {#if background}
        <div
          class={cn(
            'pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-200 ease-out motion-reduce:opacity-100 motion-reduce:transition-none',
            entered() ? 'opacity-100' : 'opacity-0'
          )}
          inert
        >
          {@render background()}
        </div>
      {/if}
    {/snippet}
  </Dialog.Overlay>
  <DialogContent
    {@attach elementRef<HTMLDivElement>(
      () => ref,
      (node) => (ref = node)
    )}
    class={cn(
      'bg-background fixed inset-0 m-auto h-fit z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border-0 p-6 shadow-lg outline-none sm:max-w-lg',
      'transition-opacity duration-200 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-150 motion-reduce:transition-none',
      stickyHeader &&
        'block max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-0',
      className
    )}
    {...restProps}
  >
    {#if stickyHeader}
      <Dialog.Header class="sticky top-0 z-10 bg-background px-6 pt-5 pb-4">
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
