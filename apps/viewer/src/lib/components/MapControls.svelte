<script lang="ts">
  import {
    Plus as PlusIcon,
    Minus as MinusIcon,
    ArrowUp as ArrowUpIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import ControlContainer from '$lib/components/ControlContainer.svelte'

  type Props = {
    onZoomIn: () => void
    onZoomOut: () => void
    mapBearing: number
    onResetBearing: () => void
  }

  let { onZoomIn, onZoomOut, mapBearing, onResetBearing }: Props = $props()

  const uiState = getUiState()
</script>

<div class="flex flex-col gap-2">
  <ControlContainer direction="column">
    <button
      onclick={onZoomIn}
      class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
    >
      <PlusIcon class="size-5" weight="bold" />
    </button>
    <button
      onclick={onZoomOut}
      class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
    >
      <MinusIcon class="size-5" weight="bold" />
    </button>
  </ControlContainer>

  <ControlContainer>
    <button
      onclick={onResetBearing}
      class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
      ><div style:rotate={-mapBearing + 'deg'}>
        <ArrowUpIcon class="size-5" weight="bold" />
      </div>
    </button>
  </ControlContainer>
</div>
