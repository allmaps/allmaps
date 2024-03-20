<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'

  import { MapMonster, Stats } from '@allmaps/ui'

  import turfRewind from '@turf/rewind'
  import { GcpTransformer } from '@allmaps/transform'
  import { validateMap } from '@allmaps/annotation'

  import { getUrls } from '$lib/shared/urls.js'
  import { getProperties } from '$lib/shared/properties.js'
  import { geometryToPath } from '$lib/shared/geometry.js'

  import type { Map } from '@allmaps/annotation'
  import type { Polygon } from 'geojson'

  type DisplayMap = {
    map: Map
    error?: string
    polygon?: Polygon
    urls?: {
      annotation?: string
      viewer?: string
      editor?: string
    }
    properties?: {
      hostname?: string
      timeAgo?: string
      areaStr?: string
    }
  }

  // TODO: export from @allmaps/ui
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
  const backgroundColors = [
    'bg-blue/20',
    'bg-purple/20',
    'bg-orange/20',
    'bg-red/20',
    'bg-pink/20',
    'bg-green/20',
    'bg-yellow/20'
  ]

  const urlLimit = Number($page.url.searchParams.get('limit')) || 250

  const limit = Math.max(1, Math.min(1000, urlLimit))

  let apiMaps: unknown[] = []
  let maps: Map[] = []
  let displayMaps: DisplayMap[] = []

  let loadingSteps: number[] = []
  let loadingInterval = setInterval(() => {
    loadingSteps.push(loadingSteps.length)
    loadingSteps = loadingSteps

    if (loadingSteps.length > 100) {
      clearInterval(loadingInterval)
    }
  }, 200)

  let errorCount = 0
  $: {
    errorCount = displayMaps.filter((map) => map.error).length
  }

  const mapsUrl = `https://api.allmaps.org/maps?limit=${limit}`

  onMount(async () => {
    const response = await fetch(mapsUrl)
    const results = await response.json()

    if (Array.isArray(results)) {
      for (const apiMap of results) {
        try {
          const mapOrMaps = validateMap(apiMap)
          const map = Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps

          apiMaps.push(apiMap)
          maps.push(map)
        } catch (err) {
          console.error(apiMap, err)
        }
      }
    }

    clearInterval(loadingInterval)
    loadingSteps = []

    let index = 0
    for (const map of maps) {
      let error: string | undefined
      let polygon: Polygon | undefined

      if (map.gcps.length >= 3) {
        if (map.resourceMask.length >= 3) {
          try {
            const transformer = new GcpTransformer(
              map.gcps,
              map.transformation?.type
            )

            polygon = transformer.transformForwardAsGeojson([map.resourceMask])

            // d3-geo requires the opposite polygon winding order of
            // the GoeJSON spec: https://github.com/d3/d3-geo
            turfRewind(polygon, { mutate: true, reverse: true })
          } catch (err) {
            let message = 'Unknown Error'
            if (err instanceof Error) {
              message = err.message
            }
            error = message
          }
        } else {
          error = 'resource mask should have more than 2 points'
        }
      } else {
        error = 'map should have more than 2 gcps'
      }

      const displayMap: DisplayMap = {
        map,
        error,
        polygon,
        urls: await getUrls(map),
        properties: getProperties(map, apiMaps[index], polygon)
      }

      displayMaps.push(displayMap)
      displayMaps = displayMaps

      index++
    }
  })
</script>

<Stats />

<ol class="grid text-xs sm:text-sm xl:text-base">
  <li
    class="rounded-lg aspect-square bg-white p-1.5 flex flex-col justify-between"
  >
    <h1 class="font-bold text-2xl">
      The latest maps edited with <a
        class="underline"
        href="https://editor.allmaps.org">Allmaps Editor</a
      >
    </h1>
    {#if displayMaps.length}
      <div class="flex flex-row justify-between">
        <div>{displayMaps.length} maps</div>
        <div>{errorCount} with errors</div>
      </div>
    {/if}
    <!-- Add config:
    - switch between resource mask and geo mask
    - sort!
    - hide errors
  -->
  </li>

  {#each loadingSteps as index}
    <li
      class="rounded-lg aspect-square bg-gray/20"
      style:scale={Math.max(0.9 - 0.02 * index, 0.05)}
    />
  {/each}

  {#each displayMaps as { map, error, polygon, urls, properties }, index}
    <li
      data-error={error !== undefined}
      class:mask={true}
      class={`${
        error ? 'bg-gray/20' : backgroundColors[index % backgroundColors.length]
      } rounded-lg aspect-square p-1.5 relative overflow-hidden`}
    >
      <div
        class="flex flex-col justify-between pointer-events-none [&>*]:pointer-events-auto h-full relative z-10"
      >
        <div class="space-y-1">
          <div
            class="break-all font-bold font-mono [mask-type:luminance] [text-shadow:0_0_1rem_#fff]"
          >
            {properties?.hostname}
          </div>
          <div>updated {properties?.timeAgo}</div>
          <div>
            <a class="underline" href={urls?.editor}>editor</a> /
            <a class="underline" href={urls?.viewer}>viewer</a> /
            <a class="underline" href={urls?.annotation}>annotation</a>
            <span></span>
          </div>
        </div>

        {#if error}
          <div class="font-bold text-center">
            {error}
          </div>
        {:else}
          <div class="flex flex-row justify-between text-center">
            <span>{map.gcps.length} gcps</span>
            <span>{map.resourceMask.length} mask pts</span>
            <span>{properties?.areaStr}</span>
          </div>
        {/if}
      </div>
      {#if error}
        <a
          href={urls?.editor}
          class="absolute left-0 top-0 w-full h-full p-1.5 flex items-center justify-center"
        >
          <div class="opacity-40">
            <MapMonster mood="sad" color="gray" />
          </div>
        </a>
      {:else if polygon}
        <a
          href={urls?.viewer}
          class="absolute left-0 top-0 w-full h-full p-1.5"
        >
          <svg viewBox="0 0 100 100">
            <path
              class={`${
                strokeColors[index % strokeColors.length]
              } fill-none stroke-2 z-0`}
              d={geometryToPath(polygon)}
            />
          </svg>
        </a>
      {/if}
    </li>
  {/each}
</ol>

<style>
  ol {
    --grid-layout-gap: 0.75rem;
    --grid-column-count: 5;
    --grid-item--min-width: 180px;

    gap: var(--grid-layout-gap);
    margin: var(--grid-layout-gap);

    /* From:
      https://css-tricks.com/an-auto-filling-css-grid-with-max-columns/ */

    --gap-count: calc(var(--grid-column-count) - 1);
    --total-gap-width: calc(var(--gap-count) * var(--grid-layout-gap));
    --grid-item--max-width: calc(
      (100% - var(--total-gap-width)) / var(--grid-column-count)
    );

    grid-template-columns: repeat(
      auto-fill,
      minmax(max(var(--grid-item--min-width), var(--grid-item--max-width)), 1fr)
    );
  }
</style>
