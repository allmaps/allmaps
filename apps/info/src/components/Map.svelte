<script lang="ts">
  import { env } from '$lib/variables'

  export let map

  const mapId = map.id
  const imageUri = map.image.uri

  const annotationUrl = `https://dev.annotations.allmaps.org/maps/${mapId}`
  const viewerUrl = `https://dev.viewer.allmaps.org/#data=data:text/x-url,${annotationUrl}`
  const editorUrl = `${env.editorBaseUrl}/#/collection?url=${imageUri}/info.json`
  const tileServerUrl = `${env.tilesBaseUrl}/maps/${mapId}/{z}/{x}/{y}.png`

  // geoMask = map ? transform.polygonToWorld(transformer, map.pixelMask) : null

//   bounds = {
//   const nw = L.geoJson(geoMask).getBounds().getNorthWest()
//   const se = L.geoJson(geoMask).getBounds().getSouthEast()

//   return [
//     [
//       nw.lat,
//       nw.lng,
//     ],[
//       se.lat,
//       se.lng
//     ]
//   ]
// }

//   https://bertspaan.nl/xyz?url=https://tiles.allmaps.org/maps/CFqQGwiHhs5Bf4Bu/{z}/{x}/{y}.png&bounds=51.92313317376381,4.354052530621939,51.87322883159531,4.5166149971211125


  // https://editor.allmaps.org/#/collection?url=https%3A%2F%2Fvu.contentdm.oclc.org%2Fdigital%2Fiiif%2Fkrt%2F1019%2Finfo.json&image=AxCqqiUiBKR1Erw1


  // - link naar viewer
  // - link naar editor
  // - link naar tile server -->

</script>

<div>
  <div>
    Map ID: <code>{map.id}</code>.
  </div>

  <ul>
    <li><a href={annotationUrl}>Georef Annotation</a></li>
    <!-- TODO: add GeoJSON polygon -->
    <li><a href={viewerUrl}>Allmaps Viewer</a></li>
    <li><a href={editorUrl}>Allmaps Editor</a></li>
    <li>XYZ tiles: <code>{tileServerUrl}</code></li>
  </ul>
</div>



