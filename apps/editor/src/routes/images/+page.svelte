<script lang="ts">
  import { blue } from '@allmaps/tailwind'

  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Images from '$lib/components/views/Images.svelte'
</script>

<!-- TODO: make sure scroll bars are not behind Controls.svelte -->
<div class="w-full h-full bg-blue/75 overflow-auto">
  <DotsPattern color={blue}>
    <div class="py-14">
      <Images />
    </div>
  </DotsPattern>
</div>
