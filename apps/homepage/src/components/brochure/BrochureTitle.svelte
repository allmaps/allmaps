<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

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

  let width = $state(0)
  let titleWidth = $state(0)
  let titleHeight = $state(0)

  let warpedResourceMasks = $state<WarpedResourceMask[]>([])

  type Sizes = [15, 10] | [12, 8] | [8, 12]

  let size = $derived.by<Sizes>(() => {
    if (width >= 900) {
      return [15, 10]
    } else if (width >= 700) {
      return [12, 8]
    } else {
      return [8, 12]
    }
  })

  let columns = $derived(size[0])
  let rows = $derived(size[1])

  let titleColumnRowBbox = $derived.by(() => {
    if (columns === 15) {
      return { columnStart: 2, columnEnd: 8, rowStart: 3, rowEnd: 5 }
    } else if (columns === 12) {
      return { columnStart: 2, columnEnd: 8, rowStart: 3, rowEnd: 5 }
    } else {
      return { columnStart: 2, columnEnd: 8, rowStart: 3, rowEnd: 5 }
    }
  })

  let subtitleColumnRowBbox = $derived.by(() => {
    if (columns === 15) {
      return { columnStart: 2, columnEnd: 11, rowStart: 6, rowEnd: 7 }
    } else if (columns === 12) {
      return { columnStart: 2, columnEnd: 11, rowStart: 6, rowEnd: 7 }
    } else {
      return { columnStart: 2, columnEnd: 8, rowStart: 6, rowEnd: 7 }
    }
  })

  let titleFontSize = $derived.by(() => {
    if (columns === 15) {
      return '13.4cqi'
    } else if (columns === 12) {
      return '13.4cqi'
    } else {
      return '13.4cqi'
    }
  })

  let subtitleFontSize = $derived.by(() => {
    if (columns === 15) {
      return '5cqi'
    } else if (columns === 12) {
      return '5cqi'
    } else {
      return '5.1cqi'
    }
  })

  // let titleRows = $derived(
  //   titleColumnRowBbox.rowEnd - titleColumnRowBbox.rowStart
  // )
  // let subtitleRows = $derived(
  //   subtitleColumnRowBbox.rowEnd - subtitleColumnRowBbox.rowStart
  // )

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
    const mapsUrl = `https://api.allmaps.org/maps?limit=180`

    const response = await fetch(mapsUrl)
    const apiMaps = await response.json()

    if (!Array.isArray(apiMaps)) {
      throw new Error('Invalid response')
    }

    warpedResourceMasks = apiMaps.flatMap((apiMap) => {
      try {
        const { id, polygon } = getWarpedResourceMask(apiMap)
        if (id && polygon.coordinates[0].length > 0) {
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

<ol
  bind:clientWidth={width}
  style:--columns={columns}
  style:--rows={rows}
  class="grid w-full list-none m-0 p-4 gap-2"
>
  {#each Array(columns) as _, column}
    {#each Array(rows) as _, row}
      {@const index = row * columns + column}
      <li
        style:grid-column={column + 1}
        style:grid-row={row + 1}
        class={[
          bgColors[index % bgColors.length],
          'aspect-square inline-block m-0 p-0 rounded-md'
        ]}
      >
        {#if warpedResourceMasks[index]}
          {@const { polygon } = warpedResourceMasks[index]}
          <svg
            transition:fade={{
              duration: 400,
              delay: Math.random() * 3000
            }}
            viewBox="0 0 100 100"
            class="m-0 block"
          >
            <path
              class={[
                strokeColors[index % strokeColors.length],
                'stroke-[3px] fill-none'
              ]}
              d={geometryToPath(polygon, 100, 100, 0.8)}
            />
          </svg>
        {/if}
      </li>
    {/each}
  {/each}
  <li
    style:grid-column-start={titleColumnRowBbox.columnStart}
    style:grid-column-end={titleColumnRowBbox.columnEnd}
    style:grid-row-start={titleColumnRowBbox.rowStart}
    style:grid-row-end={titleColumnRowBbox.rowEnd}
    bind:clientWidth={titleWidth}
    bind:clientHeight={titleHeight}
    class="m-0 overflow-hidden bg-white z-10 min-h-0 min-w-0 max-w-full max-h-full @container px-4
    flex flex-col justify-center"
  >
    <h1
      style:font-size={titleFontSize}
      style:line-height="1.2"
      class="m-0 p-0 overflow-hidden min-w-0 max-w-full font-bold"
    >
      Open up your <br /> map collections
    </h1>
  </li>
  <li
    style:grid-column-start={subtitleColumnRowBbox.columnStart}
    style:grid-column-end={subtitleColumnRowBbox.columnEnd}
    style:grid-row-start={subtitleColumnRowBbox.rowStart}
    style:grid-row-end={subtitleColumnRowBbox.rowEnd}
    class="m-0 inline-flex items-center bg-white z-10 max-w-full max-h-full @container px-4"
  >
    <h2
      style:font-size={subtitleFontSize}
      style:line-height="1.4"
      class="m-0 font-medium"
    >
      Announcing the Allmaps - IIIF Partnership
    </h2>
  </li>
</ol>

<style>
  ol {
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
  }
</style>
