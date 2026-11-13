<script lang="ts">
  import MapExample from './MapExampleWithCode.svelte'
  import { exampleLibraries } from '@allmaps/ui/examples/source'
  import type { MapExampleProps } from '../../lib/examples/types.js'

  let props: MapExampleProps = $props()
</script>

<MapExample {...props} library="MapLibre" {...exampleLibraries.MapLibre} />
