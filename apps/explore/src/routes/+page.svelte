<script lang="ts">
  import { onMount } from 'svelte'

  import maplibregl, { Map } from 'maplibre-gl'
  import layers from 'protomaps-themes-base'
  import { Protocol } from 'pmtiles'

  import { Header, Thumbnail } from '@allmaps/ui'
  import { fetchImageInfo } from '@allmaps/stdlib'
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import 'maplibre-gl/dist/maplibre-gl.css'

  let container: HTMLElement
  let map: maplibregl.Map
  let warpedMapLayer: WarpedMapLayer

  let currentAnnotationUrl: string | undefined

  let layersAdded = false

  let features: maplibregl.MapGeoJSONFeature[] = []

  const maxMaxAea = 50_000_000_000
  let maxArea = 5_000_000_000

  function getFilters(maxAea: number): maplibregl.FilterSpecification {
    return [
      'all',
      ['>=', 'area', 0],
      ['<=', 'area', maxAea],
      ['!=', 'imageServiceDomain', 'iiif.nypl.org']
    ]
  }

  $: {
    if (layersAdded) {
      map.setFilter('masks', getFilters(maxArea))
      updateFeatures()
    }
  }

  function updateFeatures() {
    features = map.queryRenderedFeatures({
      layers: ['masks']
    })
  }

  async function showOnMap(annotationUrl: string) {
    if (warpedMapLayer) {
      if (currentAnnotationUrl) {
        // TODO: add .clear() to WarpedMapLayer
        await warpedMapLayer.removeGeoreferenceAnnotationByUrl(
          currentAnnotationUrl
        )
      }
      await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
      currentAnnotationUrl = annotationUrl
    }
  }

  async function copyToClipboard(annotationUrl: string) {
    try {
      await navigator.clipboard.writeText(annotationUrl)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  onMount(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    map = new Map({
      container,
      style: {
        version: 8,
        glyphs:
          'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sources: {
          protomaps: {
            type: 'vector',
            tiles: [
              'https://api.protomaps.com/tiles/v3/{z}/{x}/{y}.mvt?key=ca7652ec836f269a'
            ],
            maxzoom: 14,
            attribution:
              '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
          }
        },
        layers: layers('protomaps', 'light')
      },
      center: [-77.41, 37.5],
      zoom: 10,
      maxPitch: 0,
      preserveDrawingBuffer: true
    })

    map.on('load', () => {
      map.addSource('masks', {
        type: 'vector',
        // url: 'pmtiles://http://127.0.0.1:8080/maps.pmtiles'
        url: 'pmtiles://https://pub-073597ae464e4b54b70bb56886a2ccb6.r2.dev/maps.pmtiles'
      })

      map.addLayer({
        id: 'masks',
        type: 'line',
        source: 'masks',
        'source-layer': 'masks',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ff69b4',
          'line-width': 2
        }
      })

      warpedMapLayer = new WarpedMapLayer()
      map.addLayer(warpedMapLayer)

      layersAdded = true

      map.on('moveend', updateFeatures)

      map.on('idle', function firstIdle() {
        updateFeatures()
        map.off('idle', firstIdle)
      })
    })

    return () => {
      map.remove()
    }
  })
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Explore" />
  <div class="w-full h-full flex flex-row min-h-0">
    <div bind:this={container} class="w-full h-full" />
    <aside class="h-full p-2 flex flex-col w-[300px] flex-shrink-0">
      <ol class="h-full overflow-auto grid gap-2">
        {#each features.slice(0, 25) as feature}
          {#await fetchImageInfo(feature.properties.resourceId)}
            <p>Loading...</p>
          {:then imageInfo}
            <Thumbnail {imageInfo} width={300} height={300} mode="contain" />
            <div>
              <button
                on:click={() => showOnMap(feature.properties.id)}
                class="py-2.5 px-5 text-sm focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100"
                >Show on map</button
              >
              <button
                on:click={() => copyToClipboard(feature.properties.id)}
                class="py-2.5 px-5 text-sm focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100"
                >Copy URL</button
              >
              <a
                class="underline"
                href="https://viewer.allmaps.org/?url={feature.properties.id}"
                target="_blank"
                rel="noreferrer">Open in Allmaps Viewer</a
              >
            </div>
          {:catch error}
            <p style="color: red">{error.message}</p>
          {/await}
        {/each}
      </ol>

      <div>
        <label
          >Max. area: <input
            class="w-full"
            bind:value={maxArea}
            min="10000"
            max={maxMaxAea}
            step={maxMaxAea / 100}
            type="range"
          /></label
        >
      </div>
    </aside>
  </div>
</div>
