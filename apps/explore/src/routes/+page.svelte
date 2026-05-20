<script lang="ts">
  import { onMount } from 'svelte'

  import { Map, addProtocol } from 'maplibre-gl'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'
  import { uniqWith } from 'lodash-es'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'

  import { Header, Thumbnail, Stats } from '@allmaps/ui'
  import { Geocoder } from '@allmaps/components'
  import {
    GeocodeEarthGeocoderProvider,
    WorldHistoricalGazetteerGeocoderProvider
  } from '@allmaps/components/geocoder'
  import { fetchImageInfo } from '@allmaps/stdlib'
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import type { MapGeoJSONFeature } from 'maplibre-gl'

  import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public'

  import { formatTimeAgo } from '$lib/shared/format.js'
  import {
    getMaskFilter,
    getMaskOpacity,
    maskBands,
    maskLayerIds,
    masksSourceMaxzoom
  } from '$lib/shared/mask-bands.js'

  import type { Bbox } from '@allmaps/types'
  import type { GeocoderGeoJsonFeature } from '@allmaps/components/geocoder'

  import 'maplibre-gl/dist/maplibre-gl.css'

  // TODO: load from config/env
  const pmtilesUrl = 'https://files.allmaps.org/maps.pmtiles'

  let container: HTMLElement
  let map: Map
  let warpedMapLayer: WarpedMapLayer

  let layersAdded = $state(false)

  let features: MapGeoJSONFeature[] = $state([])

  let lastModifiedAgo: string | undefined = $state('')

  function updateFeatures() {
    const newFeatures = map.queryRenderedFeatures({
      layers: maskLayerIds
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

  function handleGeocoderSelect(event: CustomEvent<GeocoderGeoJsonFeature>) {
    const feature = event.detail

    if (feature?.bbox) {
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
        map.setCenter(feature.geometry.coordinates as [number, number])
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
      hash: true
    })

    addTerrain(map, maplibregl)

    map.on('load', () => {
      map.addSource('masks', {
        type: 'vector',
        tiles: [`pmtiles://${pmtilesUrl}/{z}/{x}/{y}`],
        maxzoom: masksSourceMaxzoom
      })

      for (const maskBand of maskBands) {
        map.addLayer({
          id: maskBand.layerId,
          type: 'line',
          source: 'masks',
          'source-layer': maskBand.sourceLayer,
          minzoom: maskBand.minzoom,
          maxzoom: maskBand.maxzoom,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ff56ba',
            'line-width': maskBand.lineWidth,
            'line-opacity': getMaskOpacity(maskBand)
          },
          filter: getMaskFilter()
        })
      }

      warpedMapLayer = new WarpedMapLayer()

      map.addLayer(warpedMapLayer)

      layersAdded = true

      map.on('sourcedata', (event) => {
        if (event.isSourceLoaded && event.sourceId === 'masks') {
          updateFeatures()
        }
      })

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

  $effect(() => {
    if (layersAdded) {
      for (const maskLayerId of maskLayerIds) {
        map.setFilter(maskLayerId, getMaskFilter())
      }
      updateFeatures()
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
            new GeocodeEarthGeocoderProvider(PUBLIC_GEOCODE_EARTH_API_KEY),
            new WorldHistoricalGazetteerGeocoderProvider()
          ]}
          onselect={handleGeocoderSelect}
          showProviderUrls={true}
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
    <div bind:this={container}></div>
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
              <div class="shrink-0 flex gap-2 flex-wrap">
                <button
                  onclick={() => showOnMap(feature.properties.id)}
                  class="py-2.5 px-5 text-sm focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100"
                  >Show on map</button
                >
                <button
                  onclick={() => copyToClipboard(feature.properties.id)}
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
    </aside>
  </div>
</div>
