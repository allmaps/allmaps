<script lang="ts">
  import { onMount } from 'svelte'
  import { beforeNavigate } from '$app/navigation'
  import { blue } from '@allmaps/tailwind'

  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Images from '$lib/components/views/Images.svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  let scrollContainer: HTMLDivElement

  beforeNavigate(() => {
    uiState.imagesScrollTop = scrollContainer.scrollTop
  })

  onMount(() => {
    scrollContainer.scrollTop = uiState.imagesScrollTop
  })
</script>

<div class="h-full w-full overflow-auto bg-blue/75" bind:this={scrollContainer}>
  <DotsPattern color={blue}>
    <div class="py-14">
      <Images />
    </div>
  </DotsPattern>
</div>
