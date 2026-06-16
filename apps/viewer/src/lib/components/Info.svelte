<script lang="ts">
  import { browser } from '$app/environment'
  import { crossfade } from 'svelte/transition'

  import { Info as InfoIcon } from 'phosphor-svelte'

  import { LoadingSmall, Popover } from '@allmaps/components'
  import { parseLanguageString } from '@allmaps/iiif-inspector'

  import AnnotationInput from '$lib/components/AnnotationInput.svelte'
  import MapList from '$lib/components/MapList.svelte'
  import OrganizationBadge from '$lib/components/OrganizationBadge.svelte'

  import { hasInputTarget } from '$lib/shared/keyboard.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import type {
    Source,
    SourceLabels,
    OrganizationSummary,
    MapsHierarchy
  } from '$lib/types/shared.js'

  type Props = {
    source: Source
    labels: SourceLabels
    title?: string
    titleBadge?: string
    organization?: OrganizationSummary
    mapsHierarchy: MapsHierarchy
    selectedMapId?: string
  }

  let {
    source,
    labels,
    title,
    titleBadge,
    organization,
    mapsHierarchy,
    selectedMapId = $bindable()
  }: Props = $props()

  let open = $state(false)
  let showUrlInput = $state(false)

  const uiState = getUiState()

  const LOADING_ICON_DELAY = 300
  const ICON_CROSSFADE_DURATION = 300

  const [send, receive] = crossfade({
    duration: ICON_CROSSFADE_DURATION
  })

  let showTilesLoading = $state(false)

  $effect(() => {
    if (!uiState.tilesLoading) {
      showTilesLoading = false
      return
    }

    const timeout = setTimeout(() => {
      showTilesLoading = true
    }, LOADING_ICON_DELAY)

    return () => clearTimeout(timeout)
  })

  function updateShowUrlInput(
    coarsePointerQuery: MediaQueryList,
    smallViewportQuery: MediaQueryList
  ) {
    showUrlInput = !coarsePointerQuery.matches && !smallViewportQuery.matches
  }

  $effect(() => {
    if (!browser) {
      return
    }

    const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
    const smallViewportQuery = window.matchMedia('(max-width: 639px)')
    const handleInputVisibilityChange = () =>
      updateShowUrlInput(coarsePointerQuery, smallViewportQuery)

    updateShowUrlInput(coarsePointerQuery, smallViewportQuery)
    coarsePointerQuery.addEventListener('change', handleInputVisibilityChange)
    smallViewportQuery.addEventListener('change', handleInputVisibilityChange)

    return () => {
      coarsePointerQuery.removeEventListener(
        'change',
        handleInputVisibilityChange
      )
      smallViewportQuery.removeEventListener(
        'change',
        handleInputVisibilityChange
      )
    }
  })

  let labelStrings = $derived.by(() => {
    let manifestLabel: string | undefined
    let canvasLabel: string | undefined

    if (labels.manifest) {
      manifestLabel = parseLanguageString(labels.manifest, 'en')
    }

    if (labels.canvas) {
      canvasLabel = parseLanguageString(labels.canvas, 'en')
    }

    // If the manifest and canvas labels are the same, don't show the canvas label
    if (manifestLabel === canvasLabel) {
      canvasLabel = undefined
    }

    return [manifestLabel, canvasLabel].filter((label) => label !== undefined)
  })

  let sourceUrl = $derived.by(() => {
    if (source.sourceType === 'url') {
      return source.url
    }
  })

  function handleKeyDown(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.key === '/' && event.metaKey) {
      open = !open
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#snippet url(sourceUrl: string)}
  <span class="truncate">{sourceUrl}</span>
{/snippet}

{#snippet separator()}
  <span class="text-gray-500">/</span>
{/snippet}

{#snippet renderLabels(labels: string[])}
  {#each labels as label, index (index)}
    {@const last = index === labels.length - 1}

    <span class={['min-w-6 truncate font-medium']}>{label}</span>
    {#if !last}
      {@render separator()}
    {/if}
  {/each}
{/snippet}

{#snippet segments({
  labelStrings,
  sourceUrl,
  organization
}: {
  labelStrings: string[]
  sourceUrl?: string
  organization?: OrganizationSummary
})}
  {#if labelStrings.length}
    {@render renderLabels(labelStrings)}
  {:else if sourceUrl}
    <span class={['contents']}>
      {@render url(sourceUrl)}
    </span>
  {:else}
    <span>
      {source.parsed.type === 'annotation'
        ? source.parsed.maps.length === 1
          ? 'Georeferenced map'
          : `${source.parsed.maps.length} georeferenced maps`
        : 'IIIF resource'}
    </span>
  {/if}
  <OrganizationBadge {organization} class="hidden @min-2xl:inline" />
{/snippet}

{#snippet urlInput()}
  <AnnotationInput
    jsonModeHeightClass="h-24"
    submitButton={false}
    roundedFull={false}
    autoFocus={showUrlInput}
  />
{/snippet}

<Popover bind:open>
  {#snippet button()}
    <div
      class="min-w-0 max-w-xl min-h-8.5 truncate shadow hover:shadow-lg transition-all duration-100
          bg-white rounded-full px-2 py-1.5 cursor-pointer text-sm text-green font-medium leading-tight
            flex gap-2 items-center"
    >
      <div class="grid size-5 shrink-0 place-items-center text-black/80">
        {#if showTilesLoading}
          <div
            class="col-start-1 row-start-1 grid size-5 place-items-center"
            in:receive={{ key: 'info-loading-icon' }}
            out:send={{ key: 'info-loading-icon' }}
          >
            <LoadingSmall />
          </div>
        {:else}
          <div
            class="col-start-1 row-start-1 grid size-5 place-items-center"
            in:receive={{ key: 'info-loading-icon' }}
            out:send={{ key: 'info-loading-icon' }}
          >
            <InfoIcon class="size-5" weight="bold" />
          </div>
        {/if}
      </div>
      {#if title}
        <span class="min-w-0 truncate font-medium">{title}</span>
        {#if titleBadge}
          <span
            class="hidden shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 @min-lg:inline"
          >
            {titleBadge}
          </span>
        {/if}
        <OrganizationBadge {organization} class="hidden @min-2xl:inline" />
      {:else}
        {@render segments({
          labelStrings,
          sourceUrl,
          organization
        })}
      {/if}
    </div>
  {/snippet}
  {#snippet contents()}
    <div class="max-w-full w-xl space-y-2">
      {#if showUrlInput}
        {@render urlInput()}
      {/if}

      <MapList {mapsHierarchy} bind:selectedMapId {open} />
    </div>
  {/snippet}
</Popover>
