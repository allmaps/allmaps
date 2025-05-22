<script lang="ts">
  import { page } from '$app/state'

  import { ShareNetwork as ShareNetworkIcon } from 'phosphor-svelte'

  import Controls from '$lib/components/Controls.svelte'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'

  import { createRouteUrl, getFrom } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'

  const sensorsState = getSensorsState()

  import type { LayoutProps } from './$types.js'

  let { data }: LayoutProps = $props()
</script>

<div class="absolute z-50 bottom-0 w-full p-2 pointer-events-none">
  <Controls selectedMapId={data.selectedMapId}>
    {#if sensorsState.position}
      <a
        class="bg-green text-white font-bold rounded-lg self-center pointer-events-auto px-4 py-2 flex gap-2"
        href={createRouteUrl(
          page,
          `${getAllmapsId(data.selectedMapId)}/share`,
          {
            from: getFrom(sensorsState.position)
          }
        )}
      >
        <ShareNetworkIcon size="24" />
        <span>Share this map</span>
      </a>
    {/if}
  </Controls>
</div>
