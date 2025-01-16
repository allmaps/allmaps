<script lang="ts">
  import { pink } from '@allmaps/tailwind'

  import Pattern from '$lib/components/Pattern.svelte'
  import Results from '$lib/components/views/Results.svelte'
</script>

<div class="w-full h-full bg-pink/50">
  <Pattern color={pink}>
    <Results />
  </Pattern>
</div>
