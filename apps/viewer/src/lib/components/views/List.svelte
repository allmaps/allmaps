<script lang="ts">
  import { maps } from '$lib/shared/stores/maps.js'

  import MapsItem from '$lib/components/dropdowns/MapsItem.svelte'
</script>

<section class="w-full h-full overflow-y-auto">
  <div class="container pt-14 mx-auto">
    <ol class="p-2 flex flex-col gap-2">
      {#each $maps as viewerMap}
        <li class="flex flex-row">
          <MapsItem {viewerMap} />
        </li>
      {/each}
    </ol>
  </div>
</section>
