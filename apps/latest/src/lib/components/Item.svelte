<script lang="ts">
  import { onMount } from 'svelte'

  import { MapMonster } from '@allmaps/ui'

  import { parseGeoreferencedMap, getDisplayMap } from '$lib/shared/map.js'

  import { geometryToPath } from '$lib/shared/geometry.js'
  import { getUrls } from '$lib/shared/urls.js'
  import { errorCount } from '$lib/shared/stores/counts.js'

  import type { Map as GeoreferencedMap } from '@allmaps/annotation'

  import type { DisplayMap, Urls } from '$lib/shared/types.js'

  export let apiMap: unknown
  export let showProperties: boolean
  export let showUrls: boolean
  export let strokeColor: string
  export let backgroundColor: string

  let urls: Urls | undefined
  let map: GeoreferencedMap | undefined
  let displayMap: DisplayMap | undefined
  let error: string | undefined

  onMount(async () => {
    try {
      map = parseGeoreferencedMap(apiMap)
      urls = await getUrls(map)
      displayMap = await getDisplayMap(map, apiMap)
    } catch (err) {
      if (err instanceof Error) {
        error = err.message
      }

      errorCount.set($errorCount + 1)
    }
  })
</script>

<li
  data-error={error}
  class={`${
    error ? 'bg-gray/20' : backgroundColor
  } rounded-lg aspect-square p-1.5 relative overflow-hidden text-xs @lg:text-sm @2xl:text-base`}
>
  <div
    class="flex flex-col justify-between pointer-events-none [&>*]:pointer-events-auto h-full relative z-10"
  >
    <div class="space-y-1">
      {#if displayMap}
        <div
          class="break-all font-bold font-mono [mask-type:luminance] [text-shadow:0_0_1rem_#fff]"
        >
          {displayMap.hostname}
        </div>

        {#if displayMap.timeAgo}
          <div>updated {displayMap.timeAgo}</div>
        {/if}
      {/if}
      {#if showUrls && urls}
        <div>
          <a class="underline" href={urls?.editor}>editor</a> /
          <a class="underline" href={urls?.viewer}>viewer</a> /
          <a class="underline" href={urls?.annotation}>annotation</a>
        </div>
      {/if}
    </div>

    {#if error}
      <div class="font-bold text-center">
        {error}
      </div>
    {:else if displayMap && showProperties}
      <div class="flex flex-row justify-between text-center">
        <span>{displayMap.properties.gcpCount} gcps</span>
        <span>{displayMap.properties.resourceMaskPointCount} mask pts</span>
        <span>{displayMap.properties.areaStr || ''}</span>
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
  {:else if displayMap?.polygon}
    <a href={urls?.viewer} class="absolute left-0 top-0 w-full h-full p-1.5">
      <svg viewBox="0 0 100 100">
        <path
          class={`${strokeColor} fill-none stroke-2 z-0`}
          d={geometryToPath(displayMap?.polygon)}
        />
      </svg>
    </a>
  {/if}
</li>
