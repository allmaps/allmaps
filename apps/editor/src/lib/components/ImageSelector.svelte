<script lang="ts">
  import { page } from '$app/state'

  import {
    ArrowLeft as ArrowLeftIcon,
    ArrowRight as ArrowRightIcon
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
    class="flex bg-white rounded-md shadow-md p-2 gap-1 sm:gap-2 items-center"
  >
    <div class="hidden sm:inline-block whitespace-nowrap leading-tight">
      <span class="hidden md:inline-block">Image&nbsp;</span
      >{sourceState.activeImageIndex + 1} of {sourceState.imageCount}
    </div>
    <button
      class="cursor-pointer p-0 rounded-full transition-colors duration-200
       bg-white hover:bg-gray-100/80"
      onclick={handlePreviousClick}
      title="Previous image"
    >
      <ArrowLeftIcon class="size-6" />
    </button>
    <button
      class="cursor-pointer p-0 rounded-full transition-colors duration-200
       bg-white hover:bg-gray-100/80"
      onclick={handleNextClick}
      title="Next image"
    >
      <ArrowRightIcon class="size-6" />
    </button>
  </div>
{/if}
