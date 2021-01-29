<script>
  import Map from './Map.svelte'
  import IIIF from './IIIF.svelte'
  import Annotation from './Annotation.svelte'

  export let annotation
  export let maps

</script>

<div class="container">
  <Map annotation={annotation} maps={maps} />
  <nav>
    <ol>
      <li>Warped map</li>
      <li>Original map</li>
      <li>Metadata</li>
    </ol>
  </nav>
</div>

<style scoped>
.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

nav {
  border-top-color: rgba(0, 0, 0, 0.5);
  border-top-style: solid;
  border-top-width: 1px;
  margin-top: 1px;
  padding: 0.5em;
}

ol {
  list-style-type: none;
  margin: 0;
  display: flex;
  justify-content: space-around;

}
</style>
