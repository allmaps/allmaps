<script lang="ts">
  import { pink } from '@allmaps/tailwind'

  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Results from '$lib/components/views/Results.svelte'
</script>

<div class="w-full h-full bg-pink/50">
  <DotsPattern color={pink} opacity={0.3}>
    <Results />
  </DotsPattern>
</div>
