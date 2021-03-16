<script>
  import Map from './Map.svelte'
  import IIIF from './IIIF.svelte'
  import Annotation from './Annotation.svelte'
  import MapSelector from './MapSelector.svelte'

  export let annotation
  export let maps

  let selectedMap = 0

  $: map = maps[selectedMap]
  $: tab = 'map'

  function updateSelectedMap (event) {
    selectedMap = event.detail.selectedMap
  }
</script>

<div class="container">
  {#if tab === 'map'}
    <div class="ol-container">
      <Map map={map} />
    </div>
  {:else if tab === 'iiif'}
    <div class="ol-container">
      <IIIF map={map} />
    </div>
  {:else if tab === 'annotation'}
    <Annotation annotation={annotation} />
  {/if}
  <nav>
    <ol>
      <li><button class="{tab === 'map' ? 'active' : ''}"
        on:click={() => tab = 'map'}>Warped map</button></li>
      <li><button class="{tab === 'iiif' ? 'active' : ''}"
         on:click={() => tab = 'iiif'}>Original map</button></li>
      <!-- <li><button class="{tab === 'annotation' ? 'active' : ''}"
         on:click={() => tab = 'annotation'}>Metadata</button></li> -->
    </ol>
  </nav>
  {#if maps.length > 1}
    <MapSelector maps={maps} selectedMap={selectedMap}
      on:update={updateSelectedMap}/>
  {/if}
</div>

<style scoped>
.container {
  height: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

nav {
  border-top-color: rgba(0, 0, 0, 0.5);
  border-top-style: solid;
  border-top-width: 1px;
  padding: 5px;
}

nav button {
  background: white;
  border: none;
  cursor: pointer;
}

nav button.active {
  text-decoration: underline;
}

ol {
  list-style-type: none;
  margin: 0;
  display: flex;
  justify-content: center;
}

.ol-container {
  flex-grow: 1;
  height: 100%;
  position: relative;
}
</style>
