<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity'
  import { fade, scale } from 'svelte/transition'

  import { Popover } from 'bits-ui'
  import {
    ArrowRightIcon,
    CheckIcon,
    DotsThreeIcon,
    ListBulletsIcon,
    XIcon
  } from 'phosphor-svelte'

  import { MapMonster } from '@allmaps/ui'

  import { m } from '$lib/paraglide/messages.js'

  import type { MapMonsterColor, MapMonsterMood } from '@allmaps/ui'
  import type { MapGuideState } from '$lib/state/map-guide.svelte.js'
  import type {
    MapGuideDisplayAction,
    MapGuideDisplayItem,
    MapGuideTone
  } from '$lib/types/map-guide.js'

  type ToneSettings = {
    color: MapMonsterColor
    mood: MapMonsterMood
    bubbleClass: string
    textClass: string
  }

  type Props = {
    state: MapGuideState
    smallScreenPopoverContainer?: HTMLElement
    tone?: MapGuideTone
    color?: MapMonsterColor
    mood?: MapMonsterMood
    shape?: number
    minimizedLabel?: string
  }

  const POPOVER_TRANSITION_DURATION = 75

  let {
    state: guideState,
    smallScreenPopoverContainer,
    tone = 'info',
    color,
    mood,
    shape = 0,
    minimizedLabel = '…'
  }: Props = $props()

  // Match Tailwind's lg breakpoint.
  const largeScreen = new MediaQuery('(min-width: 64rem)', true)
  const portalEnabled = $derived(
    !largeScreen.current && Boolean(smallScreenPopoverContainer)
  )

  let popoverOpen = $state(true)
  let expandedContentVisible = $state(true)
  let hasMinimized = $state(false)
  let messagesOpen = $state(false)
  let messagesDialog = $state<HTMLDialogElement>()

  const toneSettings: Record<MapGuideTone, ToneSettings> = {
    excited: {
      color: 'pink',
      mood: 'excited',
      bubbleClass: 'bg-pink-100',
      textClass: 'text-pink'
    },
    info: {
      color: 'blue',
      mood: 'happy',
      bubbleClass: 'bg-blue-100',
      textClass: 'text-blue-600'
    },
    success: {
      color: 'green',
      mood: 'happy',
      bubbleClass: 'bg-green-100',
      textClass: 'text-green'
    },
    warning: {
      color: 'orange',
      mood: 'confused',
      bubbleClass: 'bg-orange-100',
      textClass: 'text-orange'
    },
    error: {
      color: 'red',
      mood: 'sad',
      bubbleClass: 'bg-red-100',
      textClass: 'text-red'
    }
  }

  const currentItem = $derived(guideState.currentItem)
  const activeTone = $derived(currentItem?.tone || tone)
  const settings = $derived(toneSettings[activeTone])
  const monsterColor = $derived(color || settings.color)
  const monsterMood = $derived(mood || settings.mood)
  const monsterButtonLabel = $derived(
    popoverOpen
      ? m.mapguide_minimize()
      : guideState.hasUnseenMessages
        ? m.mapguide_show_new_message()
        : m.mapguide_show()
  )
  const messages = $derived(guideState.messages)
  const hasModalMessages = $derived(messages.length > 0)
  const showMinimizedNotification = $derived(
    hasMinimized &&
      !popoverOpen &&
      !expandedContentVisible &&
      guideState.hasUnseenMessages
  )

  $effect(() => {
    if (popoverOpen) {
      expandedContentVisible = true
      return
    }

    const timeout = setTimeout(() => {
      expandedContentVisible = false
    }, POPOVER_TRANSITION_DURATION)

    return () => clearTimeout(timeout)
  })

  $effect(() => {
    const message = guideState.currentMessage

    if (guideState.visible && popoverOpen && message) {
      guideState.markSeen(message.key)
    }
  })

  $effect(() => {
    if (messagesOpen) {
      guideState.markAllSeen(messages.map((message) => message.key))
    }
  })

  $effect(() => {
    if (messagesOpen && !hasModalMessages) {
      messagesOpen = false
    }
  })

  $effect(() => {
    if (!messagesDialog) {
      return
    }

    if (messagesOpen && !messagesDialog.open) {
      messagesDialog.showModal()
    } else if (!messagesOpen && messagesDialog.open) {
      messagesDialog.close()
    }
  })

  function runItemAction(
    item: MapGuideDisplayItem,
    action: MapGuideDisplayAction
  ) {
    messagesOpen = false
    popoverOpen = !action.closeOnRun
    guideState.runAction(item.key, action.id)
  }

  function setPopoverOpen(open: boolean) {
    if (!open) {
      hasMinimized = true
    }

    popoverOpen = open
  }

  function openMessages() {
    if (!hasModalMessages) {
      return
    }

    messagesOpen = true
  }

  function closeMessages() {
    messagesOpen = false
  }

  function handleMessagesClose() {
    messagesOpen = false
  }

  function handleMessagesMousedown(event: MouseEvent) {
    if (event.target === messagesDialog) {
      closeMessages()
    }
  }
</script>

{#if guideState.visible}
  <Popover.Root bind:open={() => popoverOpen, setPopoverOpen}>
    <section
      class="flex min-w-0 max-w-full items-end gap-3 rounded-lg"
      aria-label={m.mapguide_messages()}
    >
      <Popover.Trigger
        class="flex w-12 cursor-pointer shrink-0 items-center justify-center rounded-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40
        [&>svg]:drop-shadow-sm [&>svg]:drop-shadow-black/20"
        aria-label={monsterButtonLabel}
      >
        <MapMonster color={monsterColor} mood={monsterMood} {shape} />
      </Popover.Trigger>

      {#if showMinimizedNotification}
        <button
          class={[
            settings.bubbleClass,
            settings.textClass,
            'relative flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-md drop-shadow-black transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40'
          ]}
          aria-label={m.mapguide_show_new_message()}
          onclick={() => (popoverOpen = true)}
        >
          <span
            class={[
              settings.bubbleClass,
              'absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45'
            ]}
          ></span>
          <span
            class="absolute -top-1 -right-1 size-3 rounded-full bg-green ring-2 ring-white"
          ></span>
          {#if minimizedLabel === '…'}
            <DotsThreeIcon class="relative size-8" weight="bold" />
          {:else if minimizedLabel === 'check'}
            <CheckIcon class="relative size-7" weight="bold" />
          {:else}
            <span class="relative px-1 text-sm font-bold">
              {minimizedLabel}
            </span>
          {/if}
        </button>
      {/if}

      <Popover.Portal
        to={smallScreenPopoverContainer}
        disabled={!portalEnabled}
      >
        <Popover.ContentStatic
          forceMount
          interactOutsideBehavior="ignore"
          trapFocus={false}
        >
          {#snippet child({ props, open })}
            {#if open && currentItem}
              <div
                {...props}
                class={[
                  'pointer-events-auto relative min-w-0',
                  portalEnabled &&
                    'mb-2 flex max-h-[calc(100%-0.5rem)] w-fit max-w-full flex-col drop-shadow-lg'
                ]}
                transition:scale={{ start: 0.15, duration: 75 }}
              >
                <div
                  class={[
                    settings.bubbleClass,
                    settings.textClass,
                    portalEnabled && 'min-h-0 w-full overflow-y-auto',
                    !portalEnabled && 'shadow-lg',
                    'map-guide-bubble relative inline-grid min-w-0 max-w-full grid-rows-[max-content_max-content] gap-2 rounded-md p-2 text-lg leading-tight font-bold'
                  ]}
                >
                  <span
                    class={[
                      settings.bubbleClass,
                      portalEnabled && 'hidden',
                      'absolute top-[calc(100%-2rem)] -left-1.5 size-3 -translate-y-1/2 rotate-45'
                    ]}
                  ></span>

                  <div
                    class="p-2 col-start-1 row-start-1 min-w-0 self-start max-w-lg"
                  >
                    <p>{currentItem.markdown}</p>
                  </div>

                  <div
                    class="map-guide-actions col-start-1 row-start-2 flex min-w-0 flex-wrap items-end gap-2 self-end"
                  >
                    {#each currentItem.actions as action (action.key)}
                      <button
                        class="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm font-bold transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
                        aria-label={action.label}
                        title={action.label}
                        onclick={() => runItemAction(currentItem, action)}
                      >
                        <ArrowRightIcon class="size-4 shrink-0" weight="bold" />
                        <span class="truncate">{action.label}</span>
                      </button>
                    {/each}
                  </div>

                  <button
                    class="col-start-2 row-start-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/50 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
                    aria-label={m.mapguide_minimize()}
                    title={m.mapguide_minimize()}
                    onclick={() => setPopoverOpen(false)}
                  >
                    <XIcon class="size-5" weight="bold" />
                  </button>

                  <button
                    class={[
                      'col-start-2 row-start-2 flex size-8 items-center justify-center self-end rounded-full bg-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30',
                      hasModalMessages
                        ? 'cursor-pointer hover:bg-white/70'
                        : 'cursor-not-allowed opacity-40'
                    ]}
                    aria-label={m.mapguide_messages()}
                    title={m.mapguide_messages()}
                    disabled={!hasModalMessages}
                    onclick={openMessages}
                  >
                    <ListBulletsIcon class="size-5" weight="bold" />
                  </button>
                </div>
                {#if portalEnabled}
                  <!-- Center the tail over the 3rem-wide monster below. -->
                  <span
                    aria-hidden="true"
                    class={[
                      settings.bubbleClass,
                      'pointer-events-none absolute -bottom-2 left-6 size-4 -translate-x-1/2 rotate-45'
                    ]}
                  ></span>
                {/if}
              </div>
            {/if}
          {/snippet}
        </Popover.ContentStatic>
      </Popover.Portal>
    </section>
  </Popover.Root>
{/if}

{#if messagesOpen}
  <dialog
    bind:this={messagesDialog}
    class="h-full max-h-full w-full max-w-full bg-transparent backdrop:bg-black/50 open:flex open:items-center open:justify-center"
    transition:fade={{ duration: 100 }}
    onclose={handleMessagesClose}
    onmousedown={handleMessagesMousedown}
  >
    <div
      class="m-4 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white p-3 text-gray-800 shadow-xl md:p-4"
      style:width="min(42rem, calc(100dvw - 2rem))"
    >
      <div class="mb-3 flex items-center justify-between gap-4">
        <h2 class="text-xl font-bold">{m.mapguide_messages()}</h2>
        <button
          class="cursor-pointer rounded-full bg-white p-1 transition-colors duration-200 hover:bg-gray-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
          aria-label={m.mapguide_close()}
          onclick={closeMessages}
        >
          <XIcon class="size-5" weight="bold" />
        </button>
      </div>

      <div class="min-h-0 overflow-auto pr-1">
        {#if hasModalMessages}
          <div class="space-y-2">
            {#each messages as message (message.key)}
              <article
                class={[
                  toneSettings[message.tone].bubbleClass,
                  toneSettings[message.tone].textClass,
                  'rounded-md p-3'
                ]}
              >
                <div class="min-w-0 space-y-3">
                  <p class="leading-snug">{message.modalMarkdown}</p>
                  <div class="flex flex-wrap gap-2">
                    {#each message.actions as action (action.key)}
                      <button
                        class="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-sm font-bold transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
                        aria-label={action.label}
                        title={action.label}
                        onclick={() => runItemAction(message, action)}
                      >
                        <ArrowRightIcon class="size-4 shrink-0" weight="bold" />
                        <span class="truncate">{action.label}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              </article>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500">{m.mapguide_no_messages()}</p>
        {/if}
      </div>
    </div>
  </dialog>
{/if}
