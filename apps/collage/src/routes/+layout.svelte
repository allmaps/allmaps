<script lang="ts">
  import type { Snippet } from 'svelte'
  import '../app.css'
  import '@allmaps/ui/css/fonts.css'
  import 'maplibre-gl/dist/maplibre-gl.css'

  let { children }: { children: Snippet } = $props()
</script>

{@render children()}
