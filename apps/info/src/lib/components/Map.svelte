<script lang="ts">
  import { env } from '$lib/shared/variables.js'

  import { generateAnnotation, type Map as MapType } from '@allmaps/annotation'

  export let map: MapType
  export let api = false

  const mapId = map.id
  const imageUri = map.image.uri

  let annotationUrl: string
  let viewerUrl: string
  let editorUrl: string
  let tileServerUrl: string

  if (api && map.id) {
    annotationUrl = `${env.annotationsBaseUrl}/maps/${mapId}`
    viewerUrl = `${env.viewerBaseUrl}/#data=data:text/x-url,${annotationUrl}`
    editorUrl = `${env.editorBaseUrl}/#/collection?url=${imageUri}/info.json`
    tileServerUrl = `${env.tilesBaseUrl}/maps/${mapId}/{z}/{x}/{y}.png`
  } else {
    const annotation = generateAnnotation(map)
    const urlAnnotation = JSON.stringify(annotation)

    viewerUrl = `${
      env.viewerBaseUrl
    }/#data=data:application/json,${encodeURIComponent(urlAnnotation)}`
    editorUrl = `${env.editorBaseUrl}/#/collection?url=${imageUri}/info.json`
    tileServerUrl = `${
      env.tilesBaseUrl
    }/{z}/{x}/{y}.png?annotation=${encodeURIComponent(urlAnnotation)}`
  }

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

  // https://bertspaan.nl/xyz?url=https://tiles.allmaps.org/maps/CFqQGwiHhs5Bf4Bu/{z}/{x}/{y}.png&bounds=51.92313317376381,4.354052530621939,51.87322883159531,4.5166149971211125
  // https://editor.allmaps.org/#/collection?url=https%3A%2F%2Fvu.contentdm.oclc.org%2Fdigital%2Fiiif%2Fkrt%2F1019%2Finfo.json&image=AxCqqiUiBKR1Erw1

  // editorUrl = `${env.editorBaseUrl}/#/collection?url=${url}`
</script>

{#if map.id}
  <p>Map ID:</p>

  <pre><code>{map.id}</code></pre>
{/if}

<ul>
  <p>Map:</p>
  <!-- <li><a href={annotationUrl}>Georef Annotation</a></li> -->
  <!-- TODO: add GeoJSON polygon -->
  <li><a href={viewerUrl}>Allmaps Viewer</a></li>
  <li><a href={editorUrl}>Allmaps Editor</a></li>
  <!-- <li>XYZ tiles: <code>{tileServerUrl}</code></li> -->
</ul>
