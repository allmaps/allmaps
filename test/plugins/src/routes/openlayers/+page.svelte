<script lang="ts">
  import proj4 from 'proj4'

  import { onMount } from 'svelte'

  import Map from 'ol/Map'
  import View from 'ol/View'
  import OSM from 'ol/source/OSM'
  import Tile from 'ol/layer/Tile'
  import { register } from 'ol/proj/proj4'

  import { WarpedMapLayer } from '@allmaps/openLayers'

  import type { Projection } from '@allmaps/project'

  let container: HTMLElement

  let map: Map
  let warpedMapLayer: WarpedMapLayer

  const annotationUrl =
    'https://sammeltassen.nl/iiif-manifests/allmaps/rotterdam-1897.json'

  let selectedProjectionId: string | undefined = $state()
  let defaultProjections: Projection[] = [
    {
      id: 'EPSG:3857',
      name: 'Webmercator projection',
      definition: 'EPSG:3857'
    },
    { id: 'EPSG:4326', name: 'Lon-lat projection', definition: 'EPSG:4326' }
  ]
  let extraProjections: Projection[] = [
    {
      id: 'EPSG:28992',
      name: 'RD new',
      definition:
        '+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.4171,50.3319,465.5524,1.9342,-1.6677,9.1019,4.0725 +units=m +no_defs +type=crs'
    },
    {
      id: 'EPSG:102019',
      name: 'Azimuthal Equidistant South Pole',
      definition:
        '+proj=aeqd +lat_0=-90 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs'
    }
  ]
  let projections: Projection[] = [...defaultProjections, ...extraProjections]

  for (const projection of extraProjections) {
    proj4.defs(projection.id as string, projection.definition)
  }
  register(proj4)

  onMount(() => {
    map = new Map({
      target: container,
      layers: [
        new Tile({
          source: new OSM()
        })
      ],
      controls: []
    })

    warpedMapLayer = new WarpedMapLayer()

    // Optional: register projections with warpedmaplayer to use existing projections instead of creating new ones from their definition
    warpedMapLayer.registerProjections(extraProjections)

    map.addLayer(warpedMapLayer)
    warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl).then(() => {
      const extent = warpedMapLayer
        .getWarpedMapList()
        .getMapsBbox({ projection: { definition: 'EPSG:3857' } })
      if (extent) {
        map.getView().fit(extent, { padding: [25, 25, 25, 25] })
      }
    })
  })

  $effect(() => {
    if (selectedProjectionId) {
      const extent = warpedMapLayer
        .getWarpedMapList()
        .getMapsBbox({ projection: { definition: selectedProjectionId } })
      if (extent) {
        map.setView(
          new View({
            projection: selectedProjectionId
          })
        )
        map.getView().fit(extent, { padding: [25, 25, 25, 25] })
      }
    }
  })
</script>

<main class="relative grid grid-cols-1 h-dvh">
  <div bind:this={container}></div>
  <div class="absolute m-2">
    <button class="p-2 bg-white rounded">Action</button>
    <select
      name="projection"
      id="projection-select"
      class="bg-white p-2 rounded"
      bind:value={selectedProjectionId}
    >
      {#each projections as projection}
        <option value={projection.id}>{projection.name}</option>
      {/each}
    </select>
  </div>
</main>
