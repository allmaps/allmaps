<script lang="ts">
  // import {Button, ButtonGroup} from 'flowbite-svelte'
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

  <!-- <ButtonGroup>
    <Button href="/">Proflie</Button>
    <Button href="/">Settings</Button>
    <Button href="/">Messages</Button>
  </ButtonGroup> -->

  <div class="btn-group absolute top-0 right-0">

      <!-- <li class:is-active={tab === 'map'}> -->
        <button class="btn" on:click={() => (tab = 'map')}>
          <span>Warped map</span>
        </button>

      <!-- <li class:is-active={tab === 'iiif'}> -->
        <button class="btn"  on:click={() => (tab = 'iiif')}>
          <span>Original image</span>
        </button>

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

  .tabs li a {
    background: white;
  }

  .ol-container {
    flex-grow: 1;
    height: 100%;
    position: relative;
  }
</style>
