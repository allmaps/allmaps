<script lang="ts">
  import { onMount } from 'svelte'

  import turfRewind from '@turf/rewind'

  import { geometryToPath } from '../../shared/geometry.js'

  import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
  import { validateGeoreferencedMap } from '@allmaps/annotation'
  import { geometryToGeojsonGeometry } from '@allmaps/stdlib'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { GeojsonPolygon } from '@allmaps/types'

  type WarpedResourceMask = {
    id: string
    polygon: GeojsonPolygon
  }

  let warpedResourceMasks = $state<WarpedResourceMask[]>([])

  // A4: 210 x 297 mm
  // MacBook Pro: 3024 x 1964: 1.54 ratio
  // 1600 x 900 px: 1.77 ratio

  const count = 15 * 10 - 20 - 10
  // const polygonWidth = 80
  // const polygonHeight = 80

  const strokeColors = [
    'stroke-blue',
    'stroke-purple',
    'stroke-orange',
    'stroke-red',
    'stroke-pink',
    'stroke-green',
    'stroke-yellow'
  ]

  // TODO: export from @allmaps/ui
  const bgColors = [
    'bg-blue/10',
    'bg-purple/10',
    'bg-orange/10',
    'bg-red/10',
    'bg-pink/10',
    'bg-green/10',
    'bg-yellow/10'
  ]

  let warpedResourceMasksLoaded = $state(false)

  function getWarpedResourceMask(apiMap: unknown) {
    const map = parseGeoreferencedMap(apiMap)
    return getWarpedResourceMaskFromGeoreferencedMap(map)
  }

  export function parseGeoreferencedMap(apiMap: unknown) {
    try {
      const mapOrMaps = validateGeoreferencedMap(apiMap)
      return Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
    } catch {
      throw new Error('Error parsing map')
    }
  }

  export function getWarpedResourceMaskFromGeoreferencedMap(
    map: GeoreferencedMap
  ) {
    // Using polynomial transformation, not map transformation type,
    // since faster when many gcps and accurate enough
    const projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(
      map,
      {
        transformationType: 'polynomial',
        projection: lonLatProjection
      }
    )

    const polygon = projectedTransformer.transformToGeo([map.resourceMask])
    const geojsonPolygon = geometryToGeojsonGeometry(polygon)

    // d3-geo requires the opposite polygon winding order of
    // the GoeJSON spec: https://github.com/d3/d3-geo
    turfRewind(geojsonPolygon, { mutate: true, reverse: true })

    return {
      id: map.id,
      polygon: geojsonPolygon
    }
  }

  async function fetchMaps() {
    const mapsUrl = `https://api.allmaps.org/maps?limit=${count}`

    const response = await fetch(mapsUrl)
    const apiMaps = await response.json()

    if (!Array.isArray(apiMaps)) {
      throw new Error('Invalid response')
    }

    warpedResourceMasks = apiMaps.flatMap((apiMap) => {
      try {
        const { id, polygon } = getWarpedResourceMask(apiMap)
        if (id) {
          return { id, polygon }
        } else {
          return []
        }
      } catch {
        return []
      }
    })

    warpedResourceMasksLoaded = true
  }

  onMount(() => {
    if (warpedResourceMasks.length === 0) {
      try {
        fetchMaps()
      } catch (err) {
        console.error(err)
      }
    } else {
      warpedResourceMasksLoaded = true
    }
  })
</script>

<ol class="grid grid-cols-15 w-full list-none m-0 p-[0.5dvw] gap-[0.5dvw]">
  <li
    class="m-0 self-center row-start-3 col-start-2 col-span-10 row-span-2 inline-flex items-center"
  >
    <h1 class="text-[6.2dvw] m-0 px-0 py-2">Open up your maps</h1>
  </li>
  <!-- <li
    class="m-0 row-start-4 col-start-2 col-span-8 row-span-1 inline-flex items-center"
  >
    <h1 class="text-5xl m-0 px-2 py-2">more accessible</h1>
  </li> -->
  <li class="m-0 row-start-6 col-start-2 col-span-10 inline-flex items-center">
    <h2 class="text-[3.1dvw] m-0 px-4 py-2 font-normal">
      Announcing the Allmaps - IIIF Partnership
    </h2>
  </li>
  {#if warpedResourceMasksLoaded}
    {#each warpedResourceMasks as { id, polygon }, index}
      <li
        class={[
          bgColors[index % bgColors.length],
          'aspect-square inline-block m-0 p-0 rounded-md'
        ]}
      >
        <svg viewBox="0 0 100 100" class="m-0">
          <path
            class={[
              strokeColors[index % strokeColors.length],
              'stroke-[3px] fill-none'
            ]}
            d={geometryToPath(polygon, 100, 100, 0.8)}
          />
        </svg>
      </li>
    {/each}
  {/if}
</ol>
