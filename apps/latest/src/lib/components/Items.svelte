<script lang="ts">
  import Item from '$lib/components/Item.svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  type Props = {
    apiMaps: unknown[]
    showProperties: boolean
    showUrls: boolean
  }

  let { apiMaps, showProperties, showUrls }: Props = $props()

  const uiState = getUiState()

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

  uiState.itemCount = apiMaps.length
</script>

{#each apiMaps as apiMap, index (index)}
  <Item
    {apiMap}
    {showProperties}
    {showUrls}
    strokeColor={strokeColors[index % strokeColors.length]}
    backgroundColor={backgroundColors[index % backgroundColors.length]}
  />
{/each}
