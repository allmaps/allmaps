<script lang="ts">
  import { blue } from '@allmaps/tailwind'

  import Pattern from '$lib/components/Pattern.svelte'
  import Images from '$lib/components/views/Images.svelte'
</script>

<div class="w-full h-full bg-blue/75 overflow-auto">
  <Pattern color={blue}>
    <div class="py-14">
      <Images />
    </div>
  </Pattern>
</div>
