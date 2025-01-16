<script lang="ts">
  import { yellow } from '@allmaps/tailwind'

  import Pattern from '$lib/components/Pattern.svelte'
  import Georeference from '$lib/components/views/Georeference.svelte'
</script>

<div class="w-full h-full bg-yellow/50">
  <Pattern color={yellow}>
    <Georeference />
  </Pattern>
</div>
