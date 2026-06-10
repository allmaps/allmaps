<script lang="ts">
  import { Plus as PlusIcon, Minus as MinusIcon } from 'phosphor-svelte'

  import ControlContainer from '$lib/components/ControlContainer.svelte'
  import ZoomToExtent from '$lib/components/ZoomToExtent.svelte'

  type Props = {
    onZoomIn: () => void
    onZoomOut: () => void
    onZoomToExtent: () => void
  }

  let { onZoomIn, onZoomOut, onZoomToExtent }: Props = $props()
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
    <ZoomToExtent {onZoomToExtent} />
  </ControlContainer>
</div>
