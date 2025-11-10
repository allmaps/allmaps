<script lang="ts">
  import { green } from '@allmaps/tailwind'

  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import ResourceMask from '$lib/components/views/ResourceMask.svelte'
</script>

<div class="h-full w-full bg-green/50">
  <DotsPattern color={green} opacity={0.3}>
    <ResourceMask />
  </DotsPattern>
</div>
