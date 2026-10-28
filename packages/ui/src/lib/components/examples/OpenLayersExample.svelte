<script lang="ts">
  import MapExample from './MapExampleWithCode.svelte'
  import type { MapExampleProps } from '../../examples/types.js'

  let props: MapExampleProps = $props()
</script>

<MapExample
  {...props}
  library="OpenLayers"
  packages="ol @allmaps/openlayers"
  createExample={async (container, signal, view) =>
    (await import('../../examples/openlayers-runtime.js')).createExample(
      container,
      signal,
      view
    )}
/>
