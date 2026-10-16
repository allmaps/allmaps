<script lang="ts">
  import {
    Trash,
    Copy,
    ArrowSquareOut,
    MagicWand,
    DropHalf,
    LockSimpleOpen,
    Palette,
    CircleHalf,
    Polygon,
    BoundingBox,
    FlipHorizontal,
    ArrowsOutCardinal,
    ArrowClockwise
  } from 'phosphor-svelte'
  import { BringMapsToFront } from '@allmaps/ui'
  import type { Control } from './control-layout'
  let { tool }: { tool: Control } = $props()
  const icons = {
    remove: Trash,
    duplicate: Copy,
    openIn: ArrowSquareOut,
    background: MagicWand,
    saturation: DropHalf,
    lock: LockSimpleOpen,
    hue: Palette,
    opacity: CircleHalf,
    editMask: Polygon,
    transform: BoundingBox,
    mirror: FlipHorizontal,
    move: ArrowsOutCardinal,
    rotate: ArrowClockwise
  }
</script>

<span class="tool-icon" aria-hidden="true">
  {#if tool === 'front'}<BringMapsToFront />
  {:else}{@const Icon = icons[tool]}<Icon size={20} />{/if}
</span>
