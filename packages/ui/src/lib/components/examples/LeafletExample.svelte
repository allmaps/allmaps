<script lang="ts">
  import MapExample from './MapExampleWithCode.svelte'
  import type { MapExampleProps } from '../../examples/types.js'

  let props: MapExampleProps = $props()
</script>

<MapExample
  {...props}
  library="Leaflet"
  packages="leaflet @allmaps/leaflet"
  createExample={async (container, signal, view) =>
    (await import('../../examples/leaflet-runtime.js')).createExample(
      container,
      signal,
      view
    )}
/>
