<script lang="ts">
  import { crossfade } from 'svelte/transition'

  import {
    Info as InfoIcon,
    SealWarning as SealWarningIcon
  } from 'phosphor-svelte'

  import { LoadingSmall, Popover } from '@allmaps/components'
  import { parseLanguageString } from '@allmaps/iiif-inspector'

  import AnnotationInput from '$lib/components/input/AnnotationInput.svelte'
  import MapList from './MapList.svelte'
  import OrganizationBadge from './OrganizationBadge.svelte'

  import { getErrorsState } from '$lib/state/errors.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { hasInputTarget } from '$lib/shared/keyboard.js'

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

  const uiState = getUiState()
  const errorsState = getErrorsState()

  const LOADING_ICON_DELAY = 300
  const ICON_CROSSFADE_DURATION = 300

  const [send, receive] = crossfade({
    duration: ICON_CROSSFADE_DURATION
  })

  let showTilesLoading = $state(false)
  let iconLabel = $derived(
    showTilesLoading
      ? 'Source information is loading'
      : errorsState.hasSourceInfoWarnings
        ? 'Source information contains warnings'
        : 'Source information'
  )

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
  {@const currentSourceValue =
    source.sourceType === 'url'
      ? source.url
      : JSON.stringify(source.data, null, 2)}

  <AnnotationInput
    jsonModeHeightClass="h-24"
    button="copy"
    autoFocus
    initialValue={currentSourceValue}
    {currentSourceValue}
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
            {#if errorsState.hasSourceInfoWarnings}
              <SealWarningIcon class="size-5 text-red" weight="bold" />
            {:else}
              <InfoIcon class="size-5" weight="bold" />
            {/if}
          </div>
        {/if}
        <span class="sr-only">{iconLabel}</span>
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
    <div class="max-w-full w-xl">
      <div class="hidden pb-2 sm:block pointer-coarse:hidden">
        {@render urlInput()}
      </div>

      <MapList {mapsHierarchy} bind:selectedMapId {open} />
    </div>
  {/snippet}
</Popover>
