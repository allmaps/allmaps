<script lang="ts">
  import { crossfade } from 'svelte/transition'

  import { InfoIcon, SealWarningIcon } from 'phosphor-svelte'

  import { LoadingSmall, Popover } from '@allmaps/ui'
  import { parseLanguageString } from '@allmaps/iiif-inspector'

  import AnnotationInput from '$lib/components/input/AnnotationInput.svelte'
  import MapList from './MapList.svelte'
  import OrganizationBadge from './OrganizationBadge.svelte'
  import SourceStarToggle from './SourceStarToggle.svelte'

  import { annotationsBaseUrl } from '$lib/shared/auth.js'
  import { getStarredResource } from '$lib/shared/starred.js'
  import { getErrorsState } from '$lib/state/errors.svelte.js'
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
  let starredResource = $derived(getStarredResource(source, annotationsBaseUrl))

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

  let sourceUrl = $derived.by(() => {
    if (source.sourceType === 'url') {
      return source.url
    }
  })

  const headerResource = $derived.by(() => {
    if (source.sourceType !== 'url') return
    if (starredResource) return starredResource.type
    if (source.allmapsId?.startsWith('maps/')) return 'map'
    if (
      source.allmapsId?.startsWith('images/') ||
      (source.parsed.type === 'iiif' && source.parsed.iiif.type === 'image')
    )
      return 'image'
    if (
      source.allmapsId?.startsWith('manifests/') ||
      (source.parsed.type === 'iiif' && source.parsed.iiif.type === 'manifest')
    )
      return 'manifest'
    if (
      source.parsed.type === 'annotation' &&
      source.parsed.maps.length === 1 &&
      source.parsed.maps[0].id === source.url
    )
      return 'map'
  })

  const imageHeaderTitle = $derived.by(() => {
    if (headerResource !== 'image') return

    const canvases = [
      ...(mapsHierarchy.mapsByCanvas ?? []),
      ...(mapsHierarchy.mapsByManifest ?? []).flatMap(
        (manifest) => manifest.mapsByCanvas
      )
    ]
    const titles = new Set(
      canvases
        .map(({ canvas }) => parseLanguageString(canvas.label, 'en').trim())
        .filter((label) => label && label !== '-')
    )
    return titles.size === 1 ? [...titles][0] : sourceUrl
  })

  const headerTitle = $derived.by(() => {
    if (source.parsed.type === 'annotation' && source.parsed.label)
      return source.parsed.label
    if (!headerResource) return title
  })

  const labelStrings = $derived.by(() => {
    const manifest = parseLanguageString(labels.manifest, 'en').trim()
    if (headerResource === 'manifest') {
      const manifestTitle =
        source.parsed.type === 'iiif' && source.parsed.iiif.type === 'manifest'
          ? parseLanguageString(source.parsed.iiif.label, 'en').trim()
          : undefined
      return [manifestTitle || manifest].filter(Boolean)
    }
    if (headerResource === 'map') return [manifest, 'Map 1'].filter(Boolean)
    const sheet =
      imageHeaderTitle ?? parseLanguageString(labels.canvas, 'en').trim()
    return [...new Set([manifest, sheet].filter(Boolean))]
  })

  function handleKeyDown(event: KeyboardEvent) {
    if (!uiState.modalOpen.keyboard && event.key === '/' && event.metaKey) {
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

    <span
      class={[
        'min-w-6 truncate font-medium',
        imageHeaderTitle && labels.length > 1 && last && 'max-w-1/2 shrink-0'
      ]}>{label}</span
    >
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

<div
  class="flex min-w-0 max-w-xl items-center rounded-full bg-white pe-0.5 shadow transition-shadow duration-100 hover:shadow-lg"
>
  <Popover bind:open>
    {#snippet button()}
      <div
        class={[
          'flex min-h-8.5 min-w-0 cursor-pointer items-center gap-2 truncate rounded-full py-1.5 ps-2 text-sm leading-tight font-medium text-green',
          headerResource ? 'pe-0.5' : 'pe-2'
        ]}
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
        {#if headerTitle}
          <span class="min-w-0 truncate font-medium">{headerTitle}</span>
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
  {#if headerResource}
    {@const headerStar = `Star ${headerResource}`}
    {#key source.hash}
      <SourceStarToggle resource={starredResource} label={headerStar} />
    {/key}
  {/if}
</div>
