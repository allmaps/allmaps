<script lang="ts">
  import { yellow } from '@allmaps/tailwind'

  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Georeference from '$lib/components/views/Georeference.svelte'
</script>

<div class="h-full w-full bg-yellow/50">
  <DotsPattern color={yellow} opacity={0.5}>
    <Georeference />
  </DotsPattern>
</div>
