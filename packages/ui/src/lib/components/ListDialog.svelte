<script lang="ts">
  import { getAbortSignal } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import LoadingSmall from './LoadingSmall.svelte'
  import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon'
  import * as Dialog from '../dialog.js'
  import Button from './ui/button/button.svelte'
  import Thumbnail from './Thumbnail.svelte'
  import type { ListDialogState } from './list-dialog/types.js'

  let {
    open = $bindable(false),
    title,
    emptyMessage,
    state: list,
    returnFocus
  }: {
    open?: boolean
    title: string
    emptyMessage: string
    state: ListDialogState
    returnFocus?: HTMLElement | null
  } = $props()

  let scrollArea = $state<HTMLDivElement>()
  const visibleRows = new SvelteSet<string>()
  let observer = $derived(
    open && scrollArea && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries, observer) => {
            for (const { isIntersecting, target } of entries) {
              if (isIntersecting) {
                observer.unobserve(target)
                visibleRows.add((target as HTMLElement).dataset.itemId!)
              }
            }
          },
          { root: scrollArea }
        )
      : undefined
  )

  function observeRow(element: HTMLElement) {
    if (!open || !scrollArea) return
    const id = element.dataset.itemId!
    const currentObserver = observer
    if (currentObserver) currentObserver.observe(element)
    else visibleRows.add(id)
    return () => {
      currentObserver?.unobserve(element)
      visibleRows.delete(id)
    }
  }

  function closeOnNavigation(event: MouseEvent) {
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      open = false
    }
  }
</script>

{#snippet preview(imageInfo: unknown)}
  {#if imageInfo}
    <svelte:boundary>
      <Thumbnail {imageInfo} width={188} height={140} mode="contain" alt="">
        {#snippet errorSnippet()}{/snippet}
      </Thumbnail>
      {#snippet failed()}{/snippet}
    </svelte:boundary>
  {/if}
{/snippet}

<Dialog.Root bind:open>
  <Dialog.Content
    class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] font-allmaps-ui"
    portalProps={{}}
    initialFocus="content"
    finalFocus={() => returnFocus ?? null}
  >
    <Dialog.Header>
      <Dialog.Title class="pe-8">{title}</Dialog.Title>
    </Dialog.Header>
    <div
      bind:this={scrollArea}
      class="min-h-0 overflow-y-auto overscroll-contain p-1 -m-1"
    >
      {#if list.status === 'loading'}
        <p role="status" class="text-sm text-muted-foreground">
          {list.message}
        </p>
      {:else if list.status === 'error'}
        <p role="alert" class="text-sm text-destructive">{list.message}</p>
        <Button class="mt-3" onclick={list.retry}>Try again</Button>
      {:else if !list.items.length}
        <p role="status" class="text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      {:else}
        <ul role="list" class="m-0 grid list-none gap-1 p-0">
          {#each list.items as item (item.id)}
            <li
              data-item-id={item.id}
              {@attach item.thumbnail?.loadImageInfo &&
              !item.thumbnail.imageInfo
                ? observeRow
                : undefined}
            >
              {#snippet row()}
                <div
                  class="h-18 w-24 shrink-0 overflow-hidden rounded bg-muted p-px"
                  aria-hidden="true"
                >
                  {#if item.thumbnail?.imageInfo}
                    {@render preview(item.thumbnail.imageInfo)}
                  {:else if open && item.thumbnail?.loadImageInfo && visibleRows.has(item.id)}
                    {#await item.thumbnail.loadImageInfo(getAbortSignal())}
                      <div class="grid h-full place-items-center">
                        <LoadingSmall />
                      </div>
                    {:then imageInfo}
                      {@render preview(imageInfo)}
                    {:catch}
                      <!-- Keep the row usable when its preview is unavailable. -->
                    {/await}
                  {/if}
                </div>
                <span class="grid min-w-0 flex-1 gap-0.5">
                  <span class="text-sm font-medium break-words"
                    >{item.label}</span
                  >
                  {#if item.detail}
                    <span class="text-xs text-muted-foreground"
                      >{item.detail}</span
                    >
                  {/if}
                </span>
              {/snippet}
              {#if item.href}
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The caller supplies the destination. -->
                <a
                  href={item.href}
                  onclick={closeOnNavigation}
                  class="group flex items-center gap-3 rounded-md p-2 text-foreground no-underline hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {@render row()}
                  <ArrowRightIcon
                    aria-hidden="true"
                    class="size-4 shrink-0 text-muted-foreground"
                  />
                </a>
              {:else}
                <div class="flex items-center gap-3 p-2">
                  {@render row()}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    {#if list.status === 'ready' && list.items.length && list.openAllHref !== undefined}
      <Dialog.Footer>
        <Button
          href={list.openAllHref ?? undefined}
          disabled={list.openAllHref === null}
          variant="primary"
          onclick={closeOnNavigation}>Open all</Button
        >
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
