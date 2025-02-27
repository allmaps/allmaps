<script lang="ts">
  import { onMount } from 'svelte'

  import { Map, addProtocol } from 'maplibre-gl'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'
  import { uniqWith } from 'lodash-es'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'

  import { Header, Thumbnail, Stats, Geocoder } from '@allmaps/ui'
  import { fetchImageInfo } from '@allmaps/stdlib'
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import type { MapGeoJSONFeature, FilterSpecification } from 'maplibre-gl'

  import { GeocodeEarth, WorldHistoricalGazetteer } from '@allmaps/ui/geocoder'

  import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public'

  import { formatTimeAgo } from '$lib/shared/format.js'

  import type { Bbox } from '@allmaps/types'

  import 'maplibre-gl/dist/maplibre-gl.css'

  // TODO: load from config/env
  const pmtilesUrl = 'https://files.allmaps.org/maps.pmtiles'

  let container: HTMLElement
  let map: Map
  let warpedMapLayer: WarpedMapLayer

  let layersAdded = false

  let features: MapGeoJSONFeature[] = []

  let lastModifiedAgo: string | undefined = ''

  const minMaxArea = 100_000
  const maxMaxAea = 500_000_000_000

  let maxAreaSqrt = Math.sqrt(5_000_000_000)

  function getFilters(maxAea: number): FilterSpecification {
    return [
      'all',
      ['>=', 'area', 0],
      ['<=', 'area', maxAea],
      ['!=', 'imageServiceDomain', 'iiif.nypl.org']
    ]
  }

  $: {
    if (layersAdded) {
      map.setFilter('masks', getFilters(maxAreaSqrt ** 2))
      updateFeatures()
    }
  }

  function updateFeatures() {
    const newFeatures = map.queryRenderedFeatures({
      layers: ['masks']
    })

    features = uniqWith(
      newFeatures,
      (a: MapGeoJSONFeature, b: MapGeoJSONFeature) =>
        a.properties.id === b.properties.id
    ).toSorted(
      (a: MapGeoJSONFeature, b: MapGeoJSONFeature) =>
        a.properties.area - b.properties.area
    )
  }

  async function showOnMap(annotationUrl: string) {
    if (warpedMapLayer) {
      warpedMapLayer.clear()

      await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
    }
  }

  async function copyToClipboard(annotationUrl: string) {
    try {
      await navigator.clipboard.writeText(annotationUrl)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  function getViewerUrl(feature: MapGeoJSONFeature) {
    return `https://viewer.allmaps.org/?url=${feature.properties.id}`
  }

  function getEditorUrl(feature: MapGeoJSONFeature) {
    return `https://editor.allmaps.org/images?url=${encodeURIComponent(feature.properties.resourceId)}/info.json`
  }

  function handleGeocoderSelect(event: CustomEvent) {
    if (event.detail?.bbox) {
      const bbox = event.detail.bbox as Bbox

      map.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]]
        ],
        {
          animate: false,
          padding: 100
        }
      )
    } else if (event.detail?.geometry) {
      if (event.detail?.geometry?.type === 'Point') {
        map.setCenter(event.detail.geometry.coordinates)
      } else {
        console.error(
          'Geocoder event geometry type not supported',
          event.detail
        )
      }
    } else {
      console.error('Geocoder event missing bbox or geometry', event.detail)
    }
  }

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    map = new Map({
      container,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      center: [14.2437, 40.8384],
      zoom: 7,
      maxPitch: 0,
      preserveDrawingBuffer: true,
      hash: true
    })

    addTerrain(map, maplibregl)

    map.on('load', () => {
      map.addSource('masks', {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`
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
          'line-color': '#ff56ba',
          'line-width': 3
        }
      })

      warpedMapLayer = new WarpedMapLayer()

      // @ts-expect-error MapLibre types are incompatible
      map.addLayer(warpedMapLayer)

      layersAdded = true

      map.on('moveend', updateFeatures)

      map.on('idle', function firstIdle() {
        updateFeatures()
        map.off('idle', firstIdle)
      })
    })

    fetch(pmtilesUrl, {
      method: 'HEAD'
    }).then((response) => {
      const lastModified = response.headers.get('Last-Modified')
      if (lastModified) {
        lastModifiedAgo = formatTimeAgo(lastModified)
      }
    })

    return () => {
      map.remove()
    }
  })
</script>

<Stats />

<div class="absolute w-full h-full grid grid-rows-[min-content_1fr]">
  <Header appName="Explore">
    <div class="w-full flex flex-row justify-between items-center gap-2">
      <div class="w-full max-w-xl">
        <Geocoder
          providers={[
            new GeocodeEarth(PUBLIC_GEOCODE_EARTH_API_KEY),
            new WorldHistoricalGazetteer()
          ]}
          on:select={handleGeocoderSelect}
        />
      </div>
      {#if lastModifiedAgo}
        <div class="text-sm whitespace-nowrap">
          Data updated {lastModifiedAgo}
        </div>
      {/if}
    </div>
  </Header>
  <div
    class="overflow-auto grid grid-rows-[50%_50%] sm:grid-rows-none sm:grid-cols-[1fr_300px]"
  >
    <div bind:this={container} />
    <aside class="relative p-2 flex flex-col min-h-0">
      <ol class="w-full h-full overflow-auto grid auto-rows-min gap-2">
        {#each features.slice(0, 25) as feature (feature.properties.id)}
          <li class="grid gap-2">
            {#await fetchImageInfo(feature.properties.resourceId)}
              <p class="h-[300px]">Loading...</p>
            {:then imageInfo}
              <a href={getViewerUrl(feature)}>
                <Thumbnail
                  {imageInfo}
                  width={300}
                  height={300}
                  mode="contain"
                />
              </a>
              <div class="flex-shrink-0 flex gap-2 flex-wrap">
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
                <div>
                  <a class="underline" href={getViewerUrl(feature)}>viewer</a> /
                  <a class="underline" href={getEditorUrl(feature)}>editor</a>
                </div>
              </div>
            {:catch error}
              <p style="color: red">{error.message}</p>
            {/await}
          </li>
        {/each}
      </ol>
      <div>
        <label
          >Max. area: <input
            class="w-full"
            bind:value={maxAreaSqrt}
            min={Math.sqrt(minMaxArea)}
            max={Math.sqrt(maxMaxAea)}
            step={(Math.sqrt(maxMaxAea) - Math.sqrt(minMaxArea)) / 100}
            type="range"
          /></label
        >
      </div>
    </aside>
  </div>
</div>
