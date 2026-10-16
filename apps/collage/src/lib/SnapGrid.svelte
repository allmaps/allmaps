<script lang="ts">
  import type { Map as MapLibreMap } from 'maplibre-gl'
  import { exportView } from './export-view'
  import { snapGrid } from './snap-grid'

  let { map, spacing }: { map: MapLibreMap; spacing: number } = $props()
  let grid = $state.raw<ReturnType<typeof snapGrid>>()

  $effect(() => {
    const currentMap = map
    const interval = spacing
    const update = () => {
      grid = snapGrid(interval, exportView(currentMap))
    }
    update()
    currentMap.on('move', update)
    currentMap.on('resize', update)
    return () => {
      currentMap.off('move', update)
      currentMap.off('resize', update)
    }
  })
</script>

<svg class="snap-grid" aria-hidden="true">
  {#if grid}
    <path class="snap-grid-minor" d={grid.minor} />
    <path class="snap-grid-major" d={grid.major} />
  {/if}
</svg>

<style>
  .snap-grid {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  path {
    fill: none;
    stroke: var(--dot-color);
    stroke-width: 1;
  }
  .snap-grid-minor {
    opacity: 0.16;
  }
  .snap-grid-major {
    opacity: 0.32;
  }
</style>
