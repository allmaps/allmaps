<script lang="ts">
  import { Banner } from '@allmaps/components'

  import type { Snippet } from 'svelte'

  const { children }: { children: Snippet } = $props()
</script>

<!-- TODO: add head tags -->
<div class="w-screen h-screen grid grid-rows-[min-content_min-content_1fr]">
  <div>
    <Banner />
  </div>

  <!-- <div class="w-full h-full top-0 left-0"> -->
  {@render children()}
  <!-- </div> -->
</div>
