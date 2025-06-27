<script lang="ts">
  import { page } from '$app/state'

  import { Envelope as EnvelopeIcon } from 'phosphor-svelte'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getResourceTransformerState } from '$lib/state/resource-transformer.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'

  import { createRouteUrl, getFrom } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'

  // import Popover from '$lib/components/Popover.svelte'
  // import NearbyMapsPopover from '$lib/components/NearbyMapsPopover.svelte'

  type Props = {
    mapId: string
  }

  const sensorsState = getSensorsState()
  const resourceTransformerState = getResourceTransformerState()
  const errorState = getErrorState()

  let { mapId }: Props = $props()
</script>

{#if sensorsState.position}
  <div class="place-self-end pointer-events-auto">
    {#if resourceTransformerState.resourcePositionInsideResource}
      <a
        class="bg-green text-white hover:bg-green-100 hover:text-green
                font-medium border-white border-2
                rounded-lg px-4 py-2 flex gap-2
                shadow hover:shadow-2xl transition-all"
        href={createRouteUrl(page, `${getAllmapsId(mapId)}/share`, {
          from: getFrom(sensorsState.position)
        })}
      >
        <EnvelopeIcon size="24" />
        <span>Share <span class="hidden sm:inline">this map</span></span>
      </a>
    {:else}
      <div>
        <!-- <Popover>{#snippet button()} -->
        <div
          class="bg-pink border-white border-3 text-white text-sm rounded-full
          px-3 py-1 shadow-lg flex flex-row items-center gap-2"
        >
          <span class="border-white border-3 rounded-full size-3 inline-block"
          ></span>
          <span class="text-center">You are outside the map</span>
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
          min-w-0 shrink px-3 py-1 place-self-end shadow-lg text-center"
  >
    Enable location services in your browser to see your location.
  </div>
{:else}
  <div></div>
{/if}
