<script lang="ts">
  import WarpedMap from './WarpedMap.svelte'
  import IIIFImage from './IIIFImage.svelte'
  import MapSelector from './MapSelector.svelte'

  import type { Map, Annotation } from '@allmaps/annotation'

  export let maps: Map[]
  export let annotation: Annotation

  let selectedMapIndex = 0

  $: map = maps[selectedMapIndex]
  $: tab = 'map'

  function updateSelectedMapIndex(event: CustomEvent) {
    selectedMapIndex = event.detail.selectedMapIndex
  }
</script>

<div class="maps">
  {#if tab === 'map'}
    <div class="ol-container">
      <WarpedMap {annotation} />
    </div>
  {:else if tab === 'iiif'}
    <div class="ol-container">
      <IIIFImage {map} />
    </div>
  {/if}

  <div class="tabs is-toggle">
    <ul>
      <li class:is-active={tab === 'map'}>
        <button on:click={() => (tab = 'map')}>
          <span>Warped map</span>
        </button>
      </li>
      <li class:is-active={tab === 'iiif'}>
        <button on:click={() => (tab = 'iiif')}>
          <span>Original image</span>
        </button>
      </li>
    </ul>
  </div>
</div>

{#if maps.length > 1}
  <MapSelector {maps} {selectedMapIndex} on:update={updateSelectedMapIndex} />
{/if}

<style scoped>
  .maps {
    height: 100%;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .tabs {
    top: 0;
    right: 0;
    position: absolute;
    padding: 0.5em;
  }

  .tabs li a {
    background: white;
  }

  .ol-container {
    flex-grow: 1;
    height: 100%;
    position: relative;
  }
</style>
