<script lang="ts">
  import { page } from '$app/state'

  import {
    ArrowLeft as ArrowLeftIcon,
    ArrowRight as ArrowRightIcon
  } from 'phosphor-svelte'

  import { getSourceState } from '$lib/state/source.svelte'
  import { getUrlState } from '$lib/shared/params.js'
  import { m } from '$lib/paraglide/messages.js'

  const sourceState = getSourceState()
  const urlState = getUrlState()

  let previousHref = $derived(
    urlState.generateUrl(page.url.pathname, {
      imageId: sourceState.getPreviousActiveImageId()
    })
  )
  let nextHref = $derived(
    urlState.generateUrl(page.url.pathname, {
      imageId: sourceState.getNextActiveImageId()
    })
  )
</script>

{#if sourceState.activeImageIndex !== undefined}
  <div
    class="flex items-center gap-1 rounded-md bg-white p-2 shadow-md sm:gap-2"
  >
    <div class="hidden leading-tight whitespace-nowrap sm:inline-block">
      {m.image_number_of_count({
        number: sourceState.activeImageIndex + 1,
        count: sourceState.imageCount
      })}
    </div>
    <a
      class="cursor-pointer rounded-full bg-white p-0 transition-colors
       duration-200 hover:bg-gray-100/80"
      href={previousHref}
      title={m.previous_image()}
    >
      <ArrowLeftIcon class="size-6" />
    </a>
    <a
      class="cursor-pointer rounded-full bg-white p-0 transition-colors
       duration-200 hover:bg-gray-100/80"
      href={nextHref}
      title={m.next_image()}
    >
      <ArrowRightIcon class="size-6" />
    </a>
  </div>
{/if}
