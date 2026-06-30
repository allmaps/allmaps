<script lang="ts">
  import {
    ArrowLeft as ArrowLeftIcon,
    ArrowRight as ArrowRightIcon
  } from 'phosphor-svelte'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import { hasInputTarget } from '$lib/shared/keyboard.js'

  import ControlContainer from './ControlContainer.svelte'
  import Control from './Control.svelte'

  const mapsState = getMapsState()
  const urlState = getUrlState()

  let previousMapIdUrl = $derived(
    mapsState.previousMapId &&
      urlState.generateUrl('/', { mapId: mapsState.previousMapId })
  )
  let nextMapIdUrl = $derived(
    mapsState.nextMapId &&
      urlState.generateUrl('/', { mapId: mapsState.nextMapId })
  )

  let showControl = $derived(
    mapsState.selectableMapCount > 1 && previousMapIdUrl && nextMapIdUrl
  )

  function handleKeyPress(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (!showControl) {
      return
    }

    if (event.key === '[' && previousMapIdUrl) {
      urlState.params.mapId = mapsState.previousMapId
    } else if (event.key === ']' && nextMapIdUrl) {
      urlState.params.mapId = mapsState.nextMapId
    }
  }
</script>

<svelte:window onkeypress={handleKeyPress} />

{#if showControl}
  <ControlContainer>
    <Control
      element="a"
      href={previousMapIdUrl}
      ariaLabel="Previous map"
      title="Previous map"
      size="large"
    >
      <ArrowLeftIcon class="size-full" />
    </Control>
    <Control
      element="a"
      href={nextMapIdUrl}
      ariaLabel="Next map"
      title="Next map"
      size="large"
    >
      <ArrowRightIcon class="size-full" />
    </Control>
  </ControlContainer>
{/if}
