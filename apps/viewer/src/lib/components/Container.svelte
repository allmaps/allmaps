<script lang="ts">
  import { SplitPane } from '@rich_harris/svelte-split-pane'

  import { view, mobile } from '$lib/shared/stores/view.js'
  import { error } from '$lib/shared/stores/error.js'
  import { mapCount } from '$lib/shared/stores/maps.js'

  import MapContainer from '$lib/components/MapContainer.svelte'
  import ListView from '$lib/components/views/List.svelte'

  import Error from '$lib/components/elements/Error.svelte'

  let width = 0
  $: {
    mobile.set(width < 540)
  }
</script>

{#if $error}
  <div class="container mx-auto">
    <Error error={$error} />
  </div>
{:else if $mapCount === 0}
  <!-- TODO: -->
  <!-- <div>EMPTY!</div> -->
{:else}
  <div class="w-full h-full relative flex flex-row" bind:clientWidth={width}>
    {#if $view !== 'map'}
      <SplitPane
        type={$mobile ? 'vertical' : 'horizontal'}
        id="main"
        min="100px"
        max="-4.1rem"
        pos="50%"
        priority="min"
        --color={'#dbdbdb'}
        --thickness={'20px'}
      >
        <section slot="a"><MapContainer /></section>
        <section slot="b"><ListView /></section>
      </SplitPane>
    {:else}
      <MapContainer />
    {/if}
  </div>
{/if}

<style>
  /* this is a hack to make the split pane full width since tailwind doesn't support 100% width for .container */
  :global(.container) {
    max-width: 100%;
  }
</style>
