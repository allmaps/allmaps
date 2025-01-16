<script lang="ts">
  import { green } from '@allmaps/tailwind'

  import Pattern from '$lib/components/Pattern.svelte'
  import ResourceMask from '$lib/components/views/ResourceMask.svelte'
</script>

<div class="w-full h-full bg-green/50">
  <Pattern color={green}>
    <ResourceMask />
  </Pattern>
</div>
