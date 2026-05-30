<script lang="ts">
  import { tick } from 'svelte'
  import { scale } from 'svelte/transition'

  import { Popover } from 'bits-ui'

  import { Drop as DropIcon } from 'phosphor-svelte'

  import OpacitySlider from '$lib/components/OpacitySlider.svelte'
  import ControlContainer from '$lib/components/ControlContainer.svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  let open = $state(false)

  let disabled = $derived(uiState.view !== 'map')

  const HOLD_DELAY_MS = 220
  const DRAG_THRESHOLD_PX = 8

  let holdTimeout: ReturnType<typeof setTimeout> | undefined
  let sliderElement = $state<HTMLInputElement>()
  let pointerDown = false
  let holdActive = false
  let draggingSlider = false
  let startY = 0
  let initialOpacity = 1
  let initiallyOpen = false

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
  }

  function clearHoldTimeout() {
    if (holdTimeout) {
      clearTimeout(holdTimeout)
      holdTimeout = undefined
    }
  }

  function toggleOpacityPreview() {
    uiState.opacity = initialOpacity > 0 ? 0 : 1
  }

  function updateOpacityFromPointer(clientY: number) {
    const sliderRect = sliderElement?.getBoundingClientRect()
    if (!sliderRect) {
      return
    }

    uiState.opacity = clamp(
      (sliderRect.bottom - clientY) / sliderRect.height,
      0,
      1
    )
  }

  function handlePointerDown(event: PointerEvent) {
    if (disabled || event.button !== 0) {
      return
    }

    const button = event.currentTarget as HTMLButtonElement | null
    if (!button) {
      return
    }

    pointerDown = true
    holdActive = false
    draggingSlider = false
    startY = event.clientY
    initialOpacity = uiState.opacity
    initiallyOpen = open

    button.setPointerCapture(event.pointerId)

    holdTimeout = setTimeout(() => {
      if (!pointerDown) {
        return
      }

      holdActive = true
      toggleOpacityPreview()
    }, HOLD_DELAY_MS)
  }

  async function handlePointerMove(event: PointerEvent) {
    if (!pointerDown || !holdActive) {
      return
    }

    const deltaY = startY - event.clientY
    if (!draggingSlider && deltaY > DRAG_THRESHOLD_PX) {
      draggingSlider = true
      open = true
      await tick()
    }

    if (draggingSlider) {
      updateOpacityFromPointer(event.clientY)
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!pointerDown) {
      return
    }

    const button = event.currentTarget as HTMLButtonElement | null

    clearHoldTimeout()
    pointerDown = false

    if (draggingSlider) {
      open = false
    } else if (holdActive) {
      uiState.opacity = initialOpacity
    } else {
      open = !initiallyOpen
    }

    holdActive = false
    draggingSlider = false

    if (button?.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId)
    }
  }

  function handleClick(event: MouseEvent) {
    event.preventDefault()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (disabled || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    event.preventDefault()
    open = true
  }
</script>

<ControlContainer roundedFull>
  <Popover.Root bind:open>
    <Popover.Trigger {disabled}>
      {#snippet child({ props })}
        <button
          {...props}
          {disabled}
          class="size-7 rounded-md bg-white not-disabled:cursor-pointer disabled:text-gray group flex items-center justify-center"
          onclick={handleClick}
          onpointerdown={handlePointerDown}
          onpointermove={handlePointerMove}
          onpointerup={handlePointerUp}
          onpointercancel={handlePointerUp}
          onkeydown={handleKeyDown}
        >
          <DropIcon class="size-6" />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content sideOffset={10} forceMount>
        {#snippet child({ wrapperProps, props, open })}
          {#if open}
            <div {...wrapperProps}>
              <div {...props} transition:scale={{ start: 0.95, duration: 75 }}>
                <OpacitySlider
                  bind:opacity={uiState.opacity}
                  bind:sliderElement
                />
              </div>
            </div>
          {/if}
        {/snippet}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
</ControlContainer>
