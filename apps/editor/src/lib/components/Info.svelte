<script lang="ts">
  import { page } from '$app/state'
  import { browser } from '$app/environment'

  import { Info as InfoIcon } from 'phosphor-svelte'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router.js'
  import { formatSourceType } from '$lib/shared/metadata.js'

  import { getUrlState } from '$lib/state/url.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getHeadState } from '$lib/state/head.svelte.js'

  import Popover from '$lib/components/Popover.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Metadata from '$lib/components/Metadata.svelte'

  const urlState = getUrlState()
  const sourceState = getSourceState()
  const headState = getHeadState()

  let autofocus = $state(false)

  let open = $state(false)

  let infoButtonWidth = $state(0)

  function hasTouch() {
    if (browser) {
      // See:
      //  - https://css-tricks.com/touch-devices-not-judged-size/
      //  - https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
      return window.matchMedia('(pointer: coarse)').matches
    }

    return false
  }

  $effect.pre(() => {
    autofocus = !hasTouch()
  })

  let sourceType = $derived(
    sourceState.source?.type
      ? formatSourceType(sourceState.source.type)
      : 'IIIF resource'
  )

  function handleInputSubmit(url: string) {
    gotoRoute(createRouteUrl(page, 'images', { url }))
  }
</script>

<Popover bind:open contentsWidth={infoButtonWidth}>
  {#snippet button()}
    <div
      bind:clientWidth={infoButtonWidth}
      class="w-full min-w-0 truncate rounded-full px-2 py-1.5
        bg-gray/10 hover:bg-gray/20
          transition-all duration-100
          border-2 inset-shadow-none hover:inset-shadow-xs
          {open ? 'border-pink bg-white' : 'border-gray/10'}
          cursor-pointer text-sm text-black leading-tight
          flex gap-2 items-center justify-between"
    >
      <span class="flex w-full justify-start">
        {#each headState.labels as label}
          <span class="truncate min-w-12 font-medium">{label}</span>
          <span class="text-gray-500 px-1">/</span>
        {/each}
        <span class="truncate">{urlState.url}</span>
      </span>
      <InfoIcon class="size-6 shrink-0" weight="bold" />
    </div>
  {/snippet}
  {#snippet contents()}
    <div class="flex flex-col gap-2">
      <span class="text-center text-sm"
        >You're georeferencing a {sourceType} from this URL:</span
      >
      <URLInput onSubmit={handleInputSubmit} {autofocus} />
      <Metadata />
    </div>
  {/snippet}
</Popover>
