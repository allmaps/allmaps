<script lang="ts">
  import { ArrowSquareOut as ArrowSquareOutIcon } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import Popover from '$lib/components/Popover.svelte'

  import { getMapLabels, formatLabels } from '$lib/shared/metadata.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  type Props = {
    map: GeoreferencedMap
  }

  let { map: propMap }: Props = $props()

  const uiState = getUiState()

  // Somehow, directly using map sometimes results in a map is undefined error
  // This happens when switching between layouts
  // This solves it. Maybe a bug in Svelte? Or I'm doing something wrong?
  let map = $state.raw<GeoreferencedMap>()
  $effect.pre(() => {
    if (propMap) {
      map = propMap
    }
  })

  // TODO: get labels and title from layout data!
  let labels = $derived(map ? getMapLabels(map) : [])
  let title = $derived(formatLabels(labels))
</script>

{#if title}
  <Popover>
    {#snippet button()}
      <div
        bind:clientWidth={uiState.elementSizes.top.center[0]}
        bind:clientHeight={uiState.elementSizes.top.center[1]}
        class="max-w-lg min-w-0 truncate shadow hover:shadow-lg inset-shadow-none hover:inset-shadow-sm
      transition-shadow duration-1000 bg-white rounded-md px-3 py-2 cursor-pointer text-xs"
      >
        {title}
      </div>
    {/snippet}
    {#snippet contents()}
      {#if map}
        <div class="bg-white rounded p-2 shadow flex flex-col gap-2">
          <input class="w-full" readonly value={map.id} />

          <!-- annotation URL -->
          <!-- metadata -->

          <div class="flex gap-2">
            {#if map.id}
              <a
                class="flex gap-1 items-center bg-orange px-2 py-1 rounded-lg"
                href="https://viewer.allmaps.org/?url={encodeURIComponent(
                  map.id
                )}"
              >
                <ArrowSquareOutIcon size="16" weight="bold" />
                Allmaps Viewer
              </a>
            {/if}
            <a
              class="flex gap-1 items-center bg-yellow px-2 py-1 rounded-lg"
              href="https://editor.allmaps.org/images?url={encodeURIComponent(
                `${map.resource.id}/info.json`
              )}"
            >
              <ArrowSquareOutIcon size="16" weight="bold" />
              Allmaps Editor
            </a>
          </div>
        </div>
      {/if}
    {/snippet}
  </Popover>
{/if}
