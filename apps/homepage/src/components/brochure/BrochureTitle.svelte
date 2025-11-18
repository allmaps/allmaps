<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  import turfRewind from '@turf/rewind'

  import { Logo } from '@allmaps/ui'

  import { geometryToPath } from '../../shared/geometry.js'

  import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
  import { validateGeoreferencedMap } from '@allmaps/annotation'
  import { geometryToGeojsonGeometry } from '@allmaps/stdlib'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  type WarpedResourceMask = {
    id: string
    path: string
  }

  let printing = $state(false)

  let width = $state(0)

  let duration = $derived(printing ? 0 : 400)
  let maxDelay = $derived(printing ? 0 : 3000)

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

  let logoRow = $derived.by(() => {
    if (columns === 15) {
      return 8
    } else if (columns === 12) {
      return 7
    } else {
      return 9
    }
  })

  let titleColumnRowBbox = $derived.by(() => {
    if (columns === 15) {
      return { columnStart: 2, columnEnd: 8, rowStart: 3, rowEnd: 5 }
    } else if (columns === 12) {
      return { columnStart: 2, columnEnd: 8, rowStart: 2, rowEnd: 4 }
    } else {
      return { columnStart: 2, columnEnd: 8, rowStart: 3, rowEnd: 5 }
    }
  })

  let subtitleColumnRowBbox = $derived.by(() => {
    if (columns === 15) {
      return { columnStart: 2, columnEnd: 11, rowStart: 6, rowEnd: 7 }
    } else if (columns === 12) {
      return { columnStart: 2, columnEnd: 11, rowStart: 5, rowEnd: 6 }
    } else {
      return { columnStart: 2, columnEnd: 6, rowStart: 6, rowEnd: 8 }
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
      return '12.0cqi'
    }
  })

  const strokeColors = [
    'stroke-blue',
    'stroke-purple',
    'stroke-orange',
    'stroke-red',
    'stroke-pink',
    'stroke-green',
    'stroke-yellow'
  ]

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

    const path = geometryToPath(geojsonPolygon, 100, 100, 0.8)

    if (!path) {
      throw new Error('Error generating path from polygon')
    }

    return {
      id: map.id,
      path
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
        const { id, path } = getWarpedResourceMask(apiMap)

        if (id && path) {
          return { id, path }
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
    const params = new URLSearchParams(window.location.search)
    printing = params.has('print')

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
  {#if width > 0}
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
            {@const { path } = warpedResourceMasks[index]}
            <svg
              transition:fade={{
                duration,
                delay: Math.random() * maxDelay
              }}
              viewBox="0 0 100 100"
              class="m-0 block"
            >
              <path
                class={[
                  strokeColors[index % strokeColors.length],
                  'stroke-[3px] fill-none'
                ]}
                d={path}
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
      class="m-0 overflow-hidden bg-white z-10 min-h-0 min-w-0 max-w-full max-h-full @container px-2
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
      class="m-0 inline-flex items-center bg-white z-10 max-w-full max-h-full @container px-2"
    >
      <h2
        style:font-size={subtitleFontSize}
        style:line-height="1.2"
        class="m-0 font-medium"
      >
        Announcing the Allmaps - IIIF Partnership
      </h2>
    </li>

    <li
      style:grid-column-start={2}
      style:grid-row-start={logoRow}
      class="bg-white z-10 inline-flex items-center justify-center"
    >
      <div class="w-3/5 h-3/5 opacity-80">
        <Logo />
      </div>
    </li>
    <li
      style:grid-column-start={3}
      style:grid-row-start={logoRow}
      class="bg-white z-10 inline-flex items-center justify-center"
    >
      <div class="w-3/5 h-3/5 opacity-80">
        <svg
          class="w-full h-full"
          version="1.1"
          x="0px"
          y="0px"
          viewBox="0 0 493.4 441.3"
          style="enable-background:new 0 0 493.4 441.3;"
          xml:space="preserve"
        >
          <g id="g10" transform="matrix(1.3333333,0,0,-1.3333333,0,441.33333)">
            <g id="g12" transform="scale(0.1)">
              <path
                id="path14"
                d="M65.2,2178.8l710-263.8L774,15L65.2,276.3V2178.8"
              />
              <path
                id="path16"
                d="M804.1,2640.1c81.4-240.9-26.5-436.2-241-436.2c-214.6,0-454.5,195.3-536,436.2
			c-81.4,240.9,26.5,436.2,241,436.2C482.8,3076.3,722.7,2881,804.1,2640.1"
              />
              <path
                id="path18"
                d="M1678.6,2178.8l-710-263.8l1.2-1900l708.8,261.3V2178.8"
              />
              <path
                id="path20"
                d="M935.1,2640.1c-81.4-240.9,26.5-436.2,241-436.2c214.6,0,454.5,195.3,536,436.2
			c81.4,240.9-26.5,436.2-241,436.2C1256.5,3076.3,1016.5,2881,935.1,2640.1"
              />
              <path
                id="path22"
                d="M1860.2,2178.8l710-263.8L2569,15l-708.8,261.3V2178.8"
              />
              <path
                id="path24"
                d="M2603.7,2640.1c81.4-240.9-26.5-436.2-241-436.2c-214.6,0-454.5,195.3-536,436.2
			c-81.4,240.9,26.5,436.2,241,436.2C2282.4,3076.3,2522.3,2881,2603.7,2640.1"
              />
              <path
                id="path26"
                d="M3700.2,3310v-652.5c0,0-230,90-257.5-142.5c-2.5-247.5,0-336.2,0-336.2l257.5,83.8V1690l-258.6-92.5v-1335
			L2735.2,0v2360C2735.2,2360,2720.2,3210,3700.2,3310"
              />
            </g>
          </g>
        </svg>
      </div>
    </li>
  {/if}
</ol>

<style>
  ol {
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
  }
</style>
