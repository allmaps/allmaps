<script lang="ts">
  import { page } from '$app/state'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon
  } from 'phosphor-svelte'

  import { createRouteUrl, getRouteId, gotoRoute } from '$lib/shared/router.js'

  import { getSourceState } from '$lib/state/source.svelte'

  const sourceState = getSourceState()

  function handlePreviousClick() {
    gotoRoute(
      createRouteUrl(page, getRouteId(page), {
        image: sourceState.getPreviousActiveImageId()
      })
    )
  }

  function handleNextClick() {
    gotoRoute(
      createRouteUrl(page, getRouteId(page), {
        image: sourceState.getNextActiveImageId()
      })
    )
  }
</script>

{#if sourceState.activeImageIndex !== undefined}
  <div
    class="flex bg-white rounded-md shadow-md p-1 gap-1 sm:p-2 sm:gap-2 items-center"
  >
    <button
      class="cursor-pointer"
      onclick={handlePreviousClick}
      title="Previous image"
    >
      <CaretLeftIcon class="size-6" />
    </button>

    <div class="hidden sm:inline-block whitespace-nowrap">
      <span class="hidden md:inline-block">Image&nbsp;</span
      >{sourceState.activeImageIndex + 1} / {sourceState.imageCount}
    </div>

    <button class="cursor-pointer" onclick={handleNextClick} title="Next image">
      <CaretRightIcon class="size-6" />
    </button>
  </div>
{/if}
