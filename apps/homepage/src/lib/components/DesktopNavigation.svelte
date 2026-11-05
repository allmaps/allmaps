<script lang="ts">
  import { tick } from 'svelte'
  import { Popover } from 'bits-ui'
  import { XIcon } from 'phosphor-svelte'

  import { navigationGroups } from '$lib/data/navigation.js'
  import SiteNavigationLinks from './SiteNavigationLinks.svelte'

  let {
    open = $bindable(false)
  }: {
    open?: boolean
  } = $props()

  const id = $props.id()
  let headings: HTMLDivElement
  let panel: HTMLDivElement | null = $state(null)
  let navigationContainer: HTMLDivElement
  let closeButton: HTMLButtonElement
  let activeGroupIndex = $state<number | undefined>()
  let alignedGroupIndex = 0
  let menuOffset = $state(0)
  let animateMenu = $state(true)
  let lastTrigger: HTMLAnchorElement | undefined
  let openedByHover = false
  let hoverSuppressed = false
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let revealTimer: ReturnType<typeof setTimeout> | undefined

  function cancelReveal() {
    clearTimeout(revealTimer)
  }

  function clearTimers() {
    cancelOpen()
    clearTimeout(closeTimer)
  }

  function cancelOpen() {
    clearTimeout(openTimer)
    openTimer = undefined
  }

  async function alignColumns(immediate = false) {
    await tick()
    if (!open || !panel || !navigationContainer) return

    const heading = headings.querySelectorAll('a')[alignedGroupIndex]
    const navigation = navigationContainer.querySelector('nav')
    const column = navigation?.querySelectorAll('section')[alignedGroupIndex]
    if (!heading || !navigation || !column) return

    const navigationBounds = navigation.getBoundingClientRect()
    const columnOffset =
      column.getBoundingClientRect().left - navigationBounds.left
    const headingLeft =
      heading.getBoundingClientRect().left +
      parseFloat(getComputedStyle(heading).paddingLeft)
    animateMenu = !immediate
    menuOffset =
      headingLeft -
      columnOffset -
      navigationContainer.getBoundingClientRect().left
  }

  function revealColumn(index: number, immediate = false) {
    if (!open || !panel || !navigationContainer) return
    const navigation = navigationContainer.querySelector('nav')
    const column = navigation?.querySelectorAll('section')[index]
    if (!navigation || !column) return

    // Measure the destination, so entering during a slide cannot compound it.
    const columnBounds = column.getBoundingClientRect()
    const columnLeft =
      navigationContainer.getBoundingClientRect().left +
      menuOffset +
      columnBounds.left -
      navigation.getBoundingClientRect().left
    const columnRight = columnLeft + columnBounds.width
    const panelBounds = panel.getBoundingClientRect()
    const minimumLeft = panelBounds.left + 16
    const maximumRight = Math.min(
      panelBounds.right - 16,
      closeButton.getBoundingClientRect().left - 16
    )
    const correction =
      columnLeft < minimumLeft
        ? minimumLeft - columnLeft
        : columnRight > maximumRight
          ? maximumRight - columnRight
          : 0

    if (correction !== 0 || immediate) {
      animateMenu = !immediate
      menuOffset += correction
    }
  }

  function activateColumn(index: number, source: 'pointer' | 'focus') {
    activeGroupIndex = index
    cancelReveal()
    if (source === 'focus') {
      revealColumn(index, true)
    } else {
      revealTimer = setTimeout(() => revealColumn(index), 180)
    }
  }

  async function resizeMenu() {
    await alignColumns()
    if (activeGroupIndex !== undefined) revealColumn(activeGroupIndex, true)
  }

  function activateHeading(index: number, opening = false) {
    cancelReveal()
    activeGroupIndex = index
    alignedGroupIndex = index
    if (opening) animateMenu = false
    void alignColumns(opening)
  }

  function close(restoreFocus = false) {
    clearTimers()
    cancelReveal()
    open = false
    openedByHover = false
    if (restoreFocus) lastTrigger?.focus()
  }

  // Navigation can re-fire pointerenter beneath a stationary cursor.
  function hoverHeading(event: PointerEvent, index: number) {
    if (event.pointerType !== 'mouse' || hoverSuppressed) return
    clearTimeout(closeTimer)
    if (open) {
      if (activeGroupIndex !== index || alignedGroupIndex !== index) {
        activateHeading(index)
      }
      return
    }
    if (openTimer !== undefined) return
    const trigger = event.currentTarget as HTMLAnchorElement
    openTimer = setTimeout(() => {
      openTimer = undefined
      lastTrigger = trigger
      openedByHover = true
      open = true
      activateHeading(index, true)
    }, 150)
  }

  function scheduleClose(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    clearTimers()
    cancelReveal()
    closeTimer = setTimeout(() => {
      if (
        openedByHover &&
        !panel?.contains(document.activeElement) &&
        !headings?.contains(document.activeElement)
      )
        close()
    }, 250)
  }

  function focusHeading(index: number) {
    headings.querySelectorAll('a')[index]?.focus()
  }

  async function handleHeadingKeydown(event: KeyboardEvent, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const lastIndex = navigationGroups.length - 1
    const headingIndex = {
      ArrowLeft: Math.max(0, index - 1),
      ArrowRight: Math.min(lastIndex, index + 1),
      Home: 0,
      End: lastIndex
    }[event.key]

    if (headingIndex !== undefined) {
      event.preventDefault()
      focusHeading(headingIndex)
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    clearTimers()
    hoverSuppressed = false
    lastTrigger = event.currentTarget as HTMLAnchorElement
    openedByHover = false
    const opening = !open
    open = true
    activateHeading(index, opening)
    await tick()
    const links = panel
      ?.querySelectorAll('section')
      [index]?.querySelectorAll('a')
    if (links?.length) {
      links[event.key === 'ArrowUp' ? links.length - 1 : 0].focus()
    }
  }

  function handleFocusOutside(event: FocusEvent) {
    if (event.target instanceof Node && headings?.contains(event.target)) return
    close()
  }

  $effect(() => {
    if (!open) {
      clearTimers()
      cancelReveal()
    }
    return () => {
      clearTimers()
      cancelReveal()
    }
  })
</script>

<svelte:window onresize={() => void resizeMenu()} />

<Popover.Root bind:open>
  <div
    bind:this={headings}
    role="group"
    aria-label="Navigation categories"
    class="hidden w-max items-center gap-6 md:flex"
    onpointerenter={clearTimers}
    onpointerleave={(event) => {
      hoverSuppressed = false
      scheduleClose(event)
    }}
  >
    {#each navigationGroups as group, index (group.title)}
      <a
        href={group.href}
        class="-mx-2 inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-left text-base font-normal whitespace-nowrap text-black/80 no-underline transition-colors duration-150 hover:text-pink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink data-[active]:text-pink motion-reduce:transition-none"
        data-active={open && activeGroupIndex === index ? '' : undefined}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onpointermove={(event) => hoverHeading(event, index)}
        onpointerleave={cancelOpen}
        onfocus={() => {
          if (open) activateHeading(index)
        }}
        onclick={() => {
          hoverSuppressed = true
          close()
        }}
        onkeydown={(event) => handleHeadingKeydown(event, index)}
      >
        {group.title}
      </a>
    {/each}
  </div>

  <Popover.ContentStatic
    id={`${id}-panel`}
    bind:ref={panel}
    class="site-menu-panel absolute top-full left-0 hidden max-h-[calc(100dvh-4rem)] w-full overflow-y-auto border-b border-black/10 bg-white py-4 shadow-lg md:block"
    trapFocus={false}
    preventScroll={false}
    onOpenAutoFocus={(event) => event.preventDefault()}
    onCloseAutoFocus={(event) => event.preventDefault()}
    onEscapeKeydown={() => close(true)}
    onInteractOutside={(event) => {
      if (event.target instanceof Node && headings?.contains(event.target)) {
        event.preventDefault()
      }
    }}
    onFocusOutside={handleFocusOutside}
    onpointerenter={clearTimers}
    onpointerleave={scheduleClose}
    onfocusin={() => {
      clearTimers()
      openedByHover = false
    }}
    onkeydowncapture={(event) => {
      // Popover loops Tab even without a focus trap. Keep normal document order.
      if (event.key === 'Tab') event.stopPropagation()
    }}
  >
    <div class="overflow-x-clip">
      <div
        class="page-width grid grid-cols-[minmax(0,10rem)_minmax(40rem,1fr)_minmax(2.5rem,8rem)] gap-6 pb-4"
      >
        <div bind:this={navigationContainer} class="col-start-2 max-w-[40rem]">
          <div
            class={[
              'ease-out motion-reduce:transition-none',
              animateMenu
                ? 'transition-transform duration-200'
                : 'transition-none'
            ]}
            style:transform={`translateX(${menuOffset}px)`}
          >
            <SiteNavigationLinks
              {activeGroupIndex}
              onActiveGroupChange={activateColumn}
              onGroupPointerLeave={cancelReveal}
              onNavigate={() => close()}
              onFocusHeading={focusHeading}
            />
          </div>
        </div>
        <button
          bind:this={closeButton}
          class="relative z-10 inline-flex size-10 cursor-pointer items-center justify-center justify-self-end rounded-md bg-white/95 text-black/60 hover:bg-gray-100 hover:text-black focus-visible:outline-2 focus-visible:outline-pink"
          type="button"
          aria-label="Close main menu"
          onclick={() => close(true)}
        >
          <XIcon class="size-5" />
        </button>
      </div>
    </div>
  </Popover.ContentStatic>
</Popover.Root>
