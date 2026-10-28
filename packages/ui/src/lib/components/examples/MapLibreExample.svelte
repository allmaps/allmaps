<script lang="ts">
  import MapExample from './MapExampleWithCode.svelte'
  import type { MapExampleProps } from '../../examples/types.js'

  let props: MapExampleProps = $props()
</script>

<MapExample
  {...props}
  library="MapLibre"
  packages="maplibre-gl @allmaps/maplibre"
  createExample={async (container, signal, view) =>
    (await import('../../examples/maplibre-runtime.js')).createExample(
      container,
      signal,
      view
    )}
/>
