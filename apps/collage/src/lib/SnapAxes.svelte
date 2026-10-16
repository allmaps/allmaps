<script lang="ts">
  import type { Map as MapLibreMap } from 'maplibre-gl'
  import type { AxisGuide } from './move-snapping'
  import { toCanvasGeo } from './coordinates'

  let { map, guide }: { map: MapLibreMap; guide: AxisGuide } = $props()
  let revision = $state(0)
  const origin = $derived.by(() => {
    void revision
    return map.project(toCanvasGeo(guide.origin))
  })
  $effect(() => {
    const currentMap = map
    const update = () => revision++
    currentMap.on('move', update)
    currentMap.on('resize', update)
    return () => {
      currentMap.off('move', update)
      currentMap.off('resize', update)
    }
  })
</script>

<svg class="snap-axes" aria-hidden="true">
  <g
    class:active={guide.axis === 0 || guide.axis === 'both'}
    data-axis="horizontal"
  >
    <line class="halo" x1="0" x2="100%" y1={origin.y} y2={origin.y} />
    <line x1="0" x2="100%" y1={origin.y} y2={origin.y} />
  </g>
  <g
    class:active={guide.axis === 1 || guide.axis === 'both'}
    data-axis="vertical"
  >
    <line class="halo" x1={origin.x} x2={origin.x} y1="0" y2="100%" />
    <line x1={origin.x} x2={origin.x} y1="0" y2="100%" />
  </g>
</svg>

<style>
  .snap-axes {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }
  g {
    opacity: 0.25;
  }
  g.active {
    opacity: 0.9;
  }
  line {
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-dasharray: 5 5;
  }
  .halo {
    stroke: white;
    stroke-width: 3.5;
  }
</style>
