<script lang="ts">
  import { page } from '$app/state'
  import { browser } from '$app/environment'

  import { Info as InfoIcon } from 'phosphor-svelte'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router.js'
  import { formatSourceType } from '$lib/shared/metadata.js'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getHeadState } from '$lib/state/head.svelte.js'

  import { Popover } from '@allmaps/components'

  import URLInput from '$lib/components/URLInput.svelte'
  import Metadata from '$lib/components/Metadata.svelte'

  const uiState = getUiState()
  const urlState = getUrlState()
  const sourceState = getSourceState()
  const headState = getHeadState()

  let bodyWidth = $state(0)

  // let open = $state(false)

  let infoButtonWidth = $state(0)

  let hasLabels = $derived(headState.labels.length > 0)

  function hasTouch() {
    if (browser) {
      // See:
      //  - https://css-tricks.com/touch-devices-not-judged-size/
      //  - https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
      return window.matchMedia('(pointer: coarse)').matches
    }

    return false
  }

  let sourceType = $derived(
    sourceState.source?.type
      ? formatSourceType(sourceState.source.type)
      : 'IIIF resource'
  )

  function handleInputSubmit(url: string) {
    gotoRoute(createRouteUrl(page, 'images', { url }))
  }
</script>

<svelte:body bind:clientWidth={bodyWidth} />

<Popover
  bind:open={
    () => uiState.getPopoverOpen('info'),
    (open) => uiState.setPopoverOpen('info', open)
  }
  contentsWidth={bodyWidth > 10240 ? infoButtonWidth : undefined}
>
  {#snippet button()}
    <div
      bind:clientWidth={infoButtonWidth}
      class="w-full min-w-0 truncate rounded-full pl-3 pr-2 py-1.5
        bg-gray/10 hover:bg-gray/20 group
        transition-all duration-100
        border-2 inset-shadow-none hover:inset-shadow-xs
        {uiState.getPopoverOpen('info')
        ? 'border-gray-200 bg-white'
        : 'border-gray/10'}
        cursor-pointer text-sm text-black leading-tight
        flex gap-2 items-center justify-between"
    >
      <span class="flex w-full justify-start-safe @container">
        {#each headState.labels as label, index (index)}
          {@const first = index === 0}
          {@const last = index === headState.labels.length - 1}

          <span
            class={[
              'truncate min-w-12 font-medium',
              !first && 'hidden @min-md:inline'
            ]}>{label}</span
          >
          {#if !last}
            <span class={['text-gray-500 px-1', 'hidden @min-md:inline']}
              >/</span
            >
          {/if}
        {/each}
        <span class={['truncate', hasLabels && 'hidden @min-lg:inline']}>
          {#if hasLabels}
            <span class="text-gray-500 px-1">/</span>
          {/if}
          <span>{urlState.url}</span>
        </span>
      </span>
      <InfoIcon
        class="size-6 shrink-0 text-gray-700 group-hover:text-black transition-all duration-100"
        weight="bold"
      />
    </div>
  {/snippet}
  {#snippet contents()}
    <div class="flex flex-col gap-2 max-w-2xl">
      <span class="text-center text-sm"
        >You're georeferencing a {sourceType} from this URL:</span
      >
      <URLInput onSubmit={handleInputSubmit} />
      <Metadata />
    </div>
  {/snippet}
</Popover>
