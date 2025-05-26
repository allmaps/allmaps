<script lang="ts">
  import { page } from '$app/state'

  import { ShareNetwork as ShareNetworkIcon } from 'phosphor-svelte'

  import Controls from '$lib/components/Controls.svelte'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getResourceTransformerState } from '$lib/state/resource-transformer.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'

  import { createRouteUrl, getFrom } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'

  import Outside from '$lib/components/Outside.svelte'
  // import Popover from '$lib/components/Popover.svelte'
  // import NearbyMapsPopover from '$lib/components/NearbyMapsPopover.svelte'

  import type { LayoutProps } from './$types.js'

  const sensorsState = getSensorsState()
  const resourceTransformerState = getResourceTransformerState()
  const errorState = getErrorState()

  let { data }: LayoutProps = $props()
</script>

<div class="w-full h-full flex flex-col justify-end items-center">
  <Outside />

  <div class="absolute z-50 bottom-0 w-full p-2 pointer-events-none">
    <Controls mapId={data.mapId}>
      {#if sensorsState.position}
        <div class="place-self-end pointer-events-auto">
          {#if resourceTransformerState.resourcePositionInsideResource}
            <a
              class="bg-green hover:bg-green-400 text-white font-bold
                rounded-lg px-4 py-2 flex gap-2
                shadow hover:shadow-2xl transition-all"
              href={createRouteUrl(page, `${getAllmapsId(data.mapId)}/share`, {
                from: getFrom(sensorsState.position)
              })}
            >
              <ShareNetworkIcon size="24" />
              <span>Share <span class="hidden sm:inline">this map</span></span>
            </a>
          {:else}
            <div>
              <!-- <Popover
                >{#snippet button()} -->
              <div
                class="bg-pink border-white border-3 text-white text-sm rounded-full
          px-3 py-1 shadow-lg flex flex-row items-center gap-1"
              >
                <span
                  class="border-white border-3 rounded-full size-3 inline-block"
                ></span>
                <span>You are outside the map area </span>
              </div>
              <!-- {/snippet}
                {#snippet contents()}
                  <NearbyMapsPopover
                    showFollow={true}
                    geojsonRoute={data.geojsonRoute}
                  />
                {/snippet}
              </Popover> -->
            </div>
          {/if}
        </div>
      {:else if errorState.geolocationPositionError}
        <div
          class="bg-red border-white border-3 text-white text-sm rounded-4xl
          min-w-0 shrink
          px-3 py-1 place-self-end shadow-lg flex flex-row items-center gap-1"
        >
          Enable location services in your browser to see your location
        </div>
      {:else}
        <div></div>
      {/if}
    </Controls>
  </div>
</div>
