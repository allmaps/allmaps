<script lang="ts">
  import MapView from '$lib/components/views/Map.svelte'
  import { view } from '$lib/shared/stores/view.js'

  import MapControl from '$lib/components/controls/Map.svelte'
  import ViewControl from '$lib/components/controls/View.svelte'
  import ImageView from '$lib/components/views/Image.svelte'

  // import PathControl from '$lib/components/controls/Path.svelte'
  import DialsControl from '$lib/components/controls/Dials.svelte'
  import SelectionControl from '$lib/components/controls/Selection.svelte'
</script>

<div class="w-full h-full relative">
  {#if $view === 'map'}
    <MapView />
  {:else}
    <ImageView />
  {/if}

  <div class="absolute top-2 right-2">
    <ViewControl />
  </div>
  <div class="absolute bottom-2 left-2">
    <MapControl />
  </div>
  <div class="absolute bottom-2 left-[50%] transform translate-x-[-50%]">
    <DialsControl />
  </div>
  <div class="absolute bottom-2 right-2">
    <SelectionControl />
  </div>
</div>
