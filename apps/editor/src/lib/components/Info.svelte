<script lang="ts">
  import {
    Info as InfoIcon,
    ArrowRight as ArrowRightIcon
  } from 'phosphor-svelte'

  import {
    gotoRoute,
    getViewUrl,
    getNewParamsFromUrl
  } from '$lib/shared/router.js'
  import { parseLanguageString } from '$lib/shared/iiif.js'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'

  import { Popover, LoadingSmall } from '@allmaps/components'

  import URLInput from '$lib/components/URLInput.svelte'
  import Metadata from '$lib/components/Metadata.svelte'
  import IIIFSource from '$lib/components/IIIFSource.svelte'

  import type { CollectionPath, SourceType } from '$lib/types/shared.js'

  type SegmentsArgs = {
    path: CollectionPath
    sourceUrl?: string
    hasError: boolean
    sourceType?: SourceType
    collectionLabel?: string
    canEdit: boolean
    editLabels: string[]
  }

  const uiState = getUiState()
  const urlState = getUrlState()
  const sourceState = getSourceState()
  const errorState = getErrorState()

  let bodyWidth = $state(0)

  let infoButtonWidth = $state(0)

  let hasError = $derived(errorState.error !== undefined)

  let sourceUrl = $derived(urlState.params.url)
  let path = $derived(urlState.params.path)
  let sourceType = $derived(sourceState.source?.type)
  let canEdit = $derived(sourceState.canEdit)
  let collectionLabel = $derived.by(() => {
    if (
      sourceState.parsedIiif &&
      sourceState.parsedIiif.type === 'collection'
    ) {
      return parseLanguageString(sourceState.parsedIiif.label, 'en')
    }
  })

  let editLabels = $derived.by(() => {
    let manifestLabel: string | undefined
    let canvasLabel: string | undefined

    if (sourceState.parsedManifest?.label) {
      manifestLabel = parseLanguageString(
        sourceState.parsedManifest?.label,
        'en'
      )
    } else if (sourceState.parsedManifest) {
      manifestLabel = 'Manifest'
    }

    if (sourceState.activeCanvas?.label) {
      canvasLabel = parseLanguageString(sourceState.activeCanvas?.label, 'en')
    } else if (sourceState.activeImageIndex !== undefined) {
      canvasLabel = `Image ${sourceState.activeImageIndex + 1}`
    }

    // If the manifest and canvas labels are the same, don't show the canvas label
    if (manifestLabel === canvasLabel) {
      canvasLabel = undefined
    }

    return [manifestLabel, canvasLabel].filter((label) => label !== undefined)
  })

  function handleInputSubmit(url: string) {
    gotoRoute(
      urlState.generateUrl(getViewUrl('images'), getNewParamsFromUrl(url))
    )
  }
</script>

<svelte:body bind:clientWidth={bodyWidth} />

{#snippet url(sourceUrl: string)}
  <span class="truncate">{sourceUrl}</span>
{/snippet}

{#snippet separator()}
  <span class="text-gray-500">/</span>
{/snippet}

{#snippet arrow()}
  <ArrowRightIcon class="inline-block size-4 text-gray-500" weight="bold" />
{/snippet}

{#snippet renderLabels(labels: string[])}
  {#each labels as label, index (index)}
    {@const first = index === 0}
    {@const last = index === editLabels.length - 1}

    <span class={['min-w-6 truncate font-medium']}>{label}</span>
    {#if !last}
      <!-- <span class="@min-md:inline hidden text-gray-500">/</span> -->
      {@render separator()}
    {/if}
  {/each}
{/snippet}

{#snippet segments({
  sourceUrl,
  path,
  hasError,
  sourceType,
  collectionLabel,
  canEdit,
  editLabels
}: SegmentsArgs)}
  {#if sourceUrl}
    {#if hasError}
      {@render url(sourceUrl)}
      {@render arrow()}
      <span
        class="border-1 border-red rounded-md bg-red-400 px-1 py-0 text-xs text-white"
        >Error loading URL</span
      >
    {:else if sourceType}
      <span
        class={[
          sourceType !== 'image' ? '@min-4xl:contents hidden' : 'contents'
        ]}
      >
        <IIIFSource {sourceType} />
      </span>

      <span
        class={[
          sourceType !== 'image' ? '@min-2xl:contents hidden' : 'contents'
        ]}
      >
        {@render url(sourceUrl)}
      </span>

      {#if sourceType === 'manifest'}
        <span class="@min-2xl:contents hidden">
          {@render separator()}
        </span>
        {@render renderLabels(editLabels)}
      {:else if sourceType === 'collection'}
        {#if collectionLabel}
          <span class="@min-2xl:contents hidden">
            {@render separator()}
          </span>
          <span class="min-w-6 truncate font-medium">{collectionLabel}</span>
        {/if}
        {#if canEdit}
          {@render separator()}
          {#if path.length > 1}
            <span>…</span>
            {@render separator()}
          {/if}
          <span class="@min-4xl:contents hidden">
            <IIIFSource sourceType="manifest" />
          </span>
          {@render renderLabels(editLabels)}
        {:else}
          {@render arrow()}
          <span
            class="border-blue border-1 rounded-md bg-blue-200 px-1 py-0 text-xs"
            >Browse to find maps <span class="@min-1xl:inline hidden"
              >in this collection <span class="@min-4xl:inline hidden"
                >and start georeferencing</span
              ></span
            ></span
          >
        {/if}
      {/if}
    {:else}
      <span class="shrink-0 opacity-50">
        <LoadingSmall />
      </span>
      {@render url(sourceUrl)}
    {/if}
  {:else}
    <span class="text-gray-500">No URL loaded</span>
  {/if}
{/snippet}

<Popover
  bind:open={uiState.popoverOpen.info}
  contentsWidth={bodyWidth < 876 ? bodyWidth : undefined}
>
  {#snippet button()}
    <div
      bind:clientWidth={infoButtonWidth}
      class="bg-gray/10 hover:bg-gray/20 inset-shadow-none hover:inset-shadow-xs group w-full min-w-0
        truncate rounded-full border-2
        py-1.5 pl-3
        pr-2 transition-all duration-100
        {uiState.popoverOpen.info
        ? 'border-gray-200 bg-white'
        : 'border-gray/10'}
        flex cursor-pointer items-center justify-between
        gap-2 text-sm leading-tight text-black"
    >
      <span
        class="justify-start-safe @container flex w-full items-center gap-2"
      >
        {@render segments({
          sourceUrl,
          path,
          hasError,
          sourceType,
          collectionLabel,
          canEdit,
          editLabels
        })}
      </span>
      <InfoIcon
        class="size-6 shrink-0 text-gray-700 transition-all duration-100 group-hover:text-black"
        weight="bold"
      />
    </div>
  {/snippet}
  {#snippet contents()}
    <div class="flex max-w-2xl flex-col gap-2">
      <span class="text-center text-sm">
        {#if sourceType}
          You're georeferencing a <IIIFSource {sourceType} /> from this URL:
        {/if}
      </span>
      <URLInput onSubmit={handleInputSubmit} />
      <Metadata />
    </div>
  {/snippet}
</Popover>
