<script lang="ts">
  import {
    Info as InfoIcon,
    ArrowRight as ArrowRightIcon
  } from 'phosphor-svelte'

  import { Popover, LoadingSmall } from '@allmaps/components'

  import AnnotationInput from '$lib/components/AnnotationInput.svelte'

  import { parseLanguageString } from '$lib/shared/iiif.js'
  import { hasInputTarget } from '$lib/shared/keyboard.js'

  import type { Source, SourceLabels, Organization } from '$lib/types/shared.js'

  type Props = {
    source: Source
    labels: SourceLabels
    organization?: Organization
  }

  let { source, labels, organization }: Props = $props()

  let open = $state(false)

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

{#snippet arrow()}
  <ArrowRightIcon class="inline-block size-4 text-gray-500" weight="bold" />
{/snippet}

{#snippet renderLabels(labels: string[])}
  {#each labels as label, index (index)}
    {@const last = index === labels.length - 1}

    <span class={['min-w-6 truncate font-medium']}>{label}</span>
    {#if !last}
      <!-- <span class="@min-md:inline hidden text-gray-500">/</span> -->
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
  organization?: Organization
})}
  {#if labelStrings.length}
    <!-- <span class="hidden @min-2xl:contents">
      {@render separator()}
    </span> -->
    {@render renderLabels(labelStrings)}
  {:else if sourceUrl}
    <span class={['contents']}>
      {@render url(sourceUrl)}
    </span>
  {:else}
    <span>WAT NU</span>
  {/if}
  {#if organization?.label}
    <span
      class="hidden @min-2xl:inline bg-blue/10 text-blue-600/80 border-[0.5px] border-blue rounded-full px-2 py-0.5 text-xs"
    >
      {parseLanguageString(organization.label, 'en')}
    </span>
  {/if}
{/snippet}

<!-- {#snippet infoButton()}
  <div
    class="max-w-xl min-w-0 truncate shadow hover:shadow-lg transition-shadow duration-100
    bg-white rounded-full px-2 py-1.5 cursor-pointer text-sm text-green font-medium leading-tight
      flex gap-2 items-center"
  >
    <span class="pl-1 overflow-hidden text-ellipsis">{manifestTitle}</span>
    <InfoIcon class="size-6 shrink-0" weight="bold" />
  </div>
{/snippet} -->
{#snippet urlInput()}
  <AnnotationInput
    jsonModeHeightClass="h-24"
    submitButton={false}
    roundedFull={false}
    autoFocus={true}
  />
{/snippet}
{#snippet metadata()}...{/snippet}

<Popover bind:open>
  {#snippet button()}
    <!-- <div
      class="group w-full min-w-0 truncate rounded-full border-2 bg-white
        py-1.5 pr-2 pl-3 transition-all duration-100
        {open ? 'border-gray-200 bg-white' : 'border-gray/10'}
        flex cursor-pointer items-center justify-between
        gap-2 text-sm leading-tight text-green"
    > -->

    <!-- <div
      class="max-w-xl min-w-0 truncate shadow hover:shadow-lg transition-shadow duration-100
          bg-white rounded-full px-2 py-1.5 cursor-pointer text-sm text-green font-medium leading-tight
            flex gap-2 items-center"
    >
      <span
        class="justify-start-safe @container flex w-full items-center gap-2"
      >
        {@render segments({
          labelStrings,
          sourceUrl,
          organization
        })}
      </span>
      <InfoIcon
        class="size-6 shrink-0 text-gray-700 transition-all duration-100 group-hover:text-black"
        weight="bold"
      />
    </div> -->

    <div
      class="min-w-0 max-w-4xl truncate shadow hover:shadow-lg transition-all duration-100
          bg-white rounded-full px-2 py-1.5 cursor-pointer text-sm text-green font-medium leading-tight
            flex gap-2 items-center"
    >
      {@render segments({
        labelStrings,
        sourceUrl,
        organization
      })}
    </div>
  {/snippet}
  {#snippet contents()}
    <div class="max-w-full w-xl">
      {@render urlInput()}
      {@render metadata()}
    </div>
  {/snippet}
</Popover>
