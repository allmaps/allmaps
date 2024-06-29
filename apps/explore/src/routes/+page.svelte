<script lang="ts">
  import { onMount } from 'svelte'

  import maplibregl from 'maplibre-gl'
  import { Map, addProtocol } from 'maplibre-gl'
  import layers from 'protomaps-themes-base'
  import { Protocol } from 'pmtiles'
  import { default as mlcontour } from 'maplibre-contour'

  import { Header, Thumbnail, Stats } from '@allmaps/ui'
  import { fetchImageInfo } from '@allmaps/stdlib'
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import type { MapGeoJSONFeature, FilterSpecification } from 'maplibre-gl'

  import { formatTimeAgo } from '$lib/shared/format.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  const pmtilesUrl =
    'https://pub-073597ae464e4b54b70bb56886a2ccb6.r2.dev/maps.pmtiles'

  let container: HTMLElement
  let map: Map
  let warpedMapLayer: WarpedMapLayer

  let currentAnnotationUrl: string | undefined

  let layersAdded = false

  let features: MapGeoJSONFeature[] = []

  let lastModifiedAgo: string | undefined = ''

  const maxMaxAea = 50_000_000_000
  let maxArea = 5_000_000_000

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
      warpedMapLayer.clear()

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

  function getViewerUrl(feature: MapGeoJSONFeature) {
    return `https://dev.viewer.allmaps.org/?url=${feature.properties.id}`
  }

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)
    var demSource = new mlcontour.DemSource({
        url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      });
    demSource.setupMaplibre(maplibregl);

    map = new Map({
      container,
      style: {
        version: 8,
        glyphs:
          'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sprite:
          'https://protomaps.github.io/basemaps-assets/sprites/v3/light',
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
      center: [14.2437, 40.8384],
      zoom: 7,
      maxPitch: 0,
      preserveDrawingBuffer: true,
      hash: true
    })

    map.on('load', () => {
      map.addSource("terrain", {
          type: 'raster-dem',
          tiles: [demSource.sharedDemProtocolUrl],
          maxzoom: 13,
          encoding: "terrarium",
          attribution: "<a href='https://github.com/tilezen/joerd/tree/master'>Joerd</a>"
        });

      map.addSource("contour-source", {
        type: "vector",
        tiles: [
          demSource.contourProtocolUrl({
            thresholds: {
              // zoom: [minor, major]
              11: [200, 1000],
              12: [100, 500],
              14: [50, 200],
              15: [20, 100],
            },
            // optional, override vector tile parameters:
            contourLayer: "contours",
            elevationKey: "ele",
            levelKey: "level",
            extent: 4096,
            buffer: 1,
          }),
        ],
        maxzoom: 15,
      });

      map.addLayer({
        id: "hillshade",
        type: "hillshade",
        source: "terrain",
        paint: {
          "hillshade-exaggeration": 0.6,
          "hillshade-shadow-color": "#bbb",
          "hillshade-highlight-color": "white",
          "hillshade-accent-color": "green"
        }
      },"water")

      map.addLayer({
        id: "contour-lines",
        type: "line",
        source: "contour-source",
        "source-layer": "contours",
        paint: {
          // level = highest index in thresholds array the elevation is a multiple of
          "line-width": ["match", ["get", "level"], 1, 1, 0.5],
        },
      }, "water");

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
    {#if lastModifiedAgo}
      <div class="w-full flex flex-row justify-end">
        <div class="text-sm">Data updated {lastModifiedAgo}</div>
      </div>
    {/if}
  </Header>
  <div
    class="overflow-auto grid grid-rows-[50%_50%] sm:grid-rows-none sm:grid-cols-[1fr_300px]"
  >
    <div bind:this={container} />
    <aside class="relative p-2 flex flex-col min-h-0">
      <ol class="w-full h-full overflow-auto grid auto-rows-min gap-2">
        {#each features.slice(0, 25) as feature}
          <li class="grid gap-2">
            {#await fetchImageInfo(feature.properties.resourceId)}
              <p>Loading...</p>
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
                <a class="underline" href={getViewerUrl(feature)}
                  >Open in Allmaps Viewer</a
                >
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
