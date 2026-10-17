<script lang="ts">
  import {
    Trash,
    Copy,
    ArrowSquareOut,
    MagicWand,
    DropHalf,
    Palette,
    CircleHalf,
    BoundingBox,
    FlipHorizontal,
    ArrowsOutCardinal,
    ArrowClockwise,
    Eraser,
    LockSimpleOpen
  } from 'phosphor-svelte'
  import { BringMapsToFront } from '@allmaps/ui'
  import MaskIcon from './MaskIcon.svelte'
  import type { Control } from './control-layout'
  let { tool }: { tool: Control } = $props()
  const icons = {
    remove: Trash,
    duplicate: Copy,
    openIn: ArrowSquareOut,
    background: MagicWand,
    saturation: DropHalf,
    hue: Palette,
    opacity: CircleHalf,
    editMask: MaskIcon,
    transform: BoundingBox,
    mirror: FlipHorizontal,
    move: ArrowsOutCardinal,
    rotate: ArrowClockwise,
    reset: Eraser,
    lock: LockSimpleOpen
  }
</script>

<span class="tool-icon" aria-hidden="true">
  {#if tool === 'front'}<BringMapsToFront />
  {:else}{@const Icon = icons[tool]}<Icon size={20} />{/if}
</span>
