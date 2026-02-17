<script lang="ts">
  import {
    // CaretLeft as CaretLeftIcon,
    // CaretRight as CaretRightIcon
    ArrowLeft as ArrowLeftIcon,
    ArrowRight as ArrowRightIcon
  } from 'phosphor-svelte'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import { hasInputTarget } from '$lib/shared/keyboard.js'

  import ControlContainer from '$lib/components/ControlContainer.svelte'

  const sourceState = getSourceState()
  const urlState = getUrlState()

  let previousMapIdUrl = $derived(
    sourceState.previousMapId &&
      urlState.generateUrl('/', { mapId: sourceState.previousMapId })
  )
  let nextMapIdUrl = $derived(
    sourceState.nextMapId &&
      urlState.generateUrl('/', { mapId: sourceState.nextMapId })
  )

  let showControl = $derived(
    sourceState.maps.length > 1 && previousMapIdUrl && nextMapIdUrl
  )

  function handleKeyPress(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (!showControl) {
      return
    }

    if (event.key === '[' && previousMapIdUrl) {
      urlState.params.mapId = sourceState.previousMapId
    } else if (event.key === ']' && nextMapIdUrl) {
      urlState.params.mapId = sourceState.nextMapId
    }
  }
</script>

<svelte:window onkeypress={handleKeyPress} />

{#if showControl}
  <ControlContainer>
    <a
      href={previousMapIdUrl}
      class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
    >
      <ArrowLeftIcon class="size-5" weight="bold" />
    </a>
    <a
      href={nextMapIdUrl}
      class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
    >
      <ArrowRightIcon class="size-5" weight="bold" />
    </a>
  </ControlContainer>
{/if}
