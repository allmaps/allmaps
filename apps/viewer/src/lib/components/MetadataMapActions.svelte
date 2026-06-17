<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import {
    CaretDown as CaretDownIcon,
    Copy as CopyIcon,
    PencilSimple as PencilSimpleIcon
  } from 'phosphor-svelte'

  import {
    copyMapAnnotation,
    getAllmapsAnnotationMapId,
    getAllmapsAnnotationMapUrl,
    getMapEditorUrl
  } from '$lib/shared/map-actions.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  type Props = {
    map: GeoreferencedMap
    isSelected?: boolean
    isEmbedded?: boolean
  }

  let { map, isSelected = false, isEmbedded = false }: Props = $props()

  let editorUrl = $derived(getMapEditorUrl(map))
  let allmapsMapId = $derived(getAllmapsAnnotationMapId(map.id))
  let allmapsMapUrl = $derived(
    isEmbedded ? undefined : getAllmapsAnnotationMapUrl(map.id)
  )

  const actionButtonClass =
    'cursor-pointer inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs transition-colors hover:bg-gray-100 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink disabled:cursor-not-allowed disabled:opacity-40'
  const selectedActionButtonClass =
    'cursor-pointer inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs transition-colors bg-pink/5 text-pink hover:bg-pink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink disabled:cursor-not-allowed disabled:opacity-40'
  const dropdownItemClass =
    'flex h-8 cursor-pointer select-none items-center gap-2 rounded px-2 text-xs outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100 data-disabled:cursor-not-allowed data-disabled:opacity-40'

  async function handleCopyAnnotation() {
    try {
      await copyMapAnnotation(map)
    } catch (error) {
      console.error('Failed to copy annotation:', error)
    }
  }

  async function handleCopyAnnotationUrl() {
    if (!allmapsMapUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(allmapsMapUrl)
    } catch (error) {
      console.error('Failed to copy annotation URL:', error)
    }
  }
</script>

{#snippet annotationSource()}
  {#if allmapsMapId && allmapsMapUrl}
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      href={allmapsMapUrl}
      target="_blank"
      rel="noopener noreferrer"
      class={[
        'inline-flex h-8 items-center truncate rounded bg-gray-100 px-2 font-mono text-xs transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink hover:underline',
        isSelected ? 'bg-pink/5 text-pink hover:bg-pink/10' : ''
      ]}
      title={allmapsMapUrl}
    >
      {allmapsMapId}
    </a>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {:else}
    <span
      class={[
        'inline-flex h-8 shrink-0 items-center rounded bg-gray-100 px-2 text-xs font-medium text-gray-600',
        isSelected ? 'bg-pink/5 text-pink' : ''
      ]}
    >
      Embedded
    </span>
  {/if}
{/snippet}

<div class="flex min-w-0 flex-wrap items-center gap-1">
  {@render annotationSource()}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class={isSelected ? selectedActionButtonClass : actionButtonClass}
    >
      <CopyIcon class="size-4" />
      <span>Copy</span>
      <CaretDownIcon class="size-3.5" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class="z-50 min-w-48 rounded-lg border border-gray-200 bg-white px-1 py-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        side="bottom"
        align="start"
        sideOffset={4}
      >
        <DropdownMenu.Item
          class={dropdownItemClass}
          onSelect={handleCopyAnnotationUrl}
          disabled={!allmapsMapUrl}
        >
          <CopyIcon class="size-4" />
          <span>Annotation URL</span>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class={dropdownItemClass}
          onSelect={handleCopyAnnotation}
        >
          <CopyIcon class="size-4" />
          <span>Annotation</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>

  {#if allmapsMapUrl}
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      class={isSelected ? selectedActionButtonClass : actionButtonClass}
      href={editorUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <PencilSimpleIcon class="size-4" />
      <span>Edit in Allmaps Editor</span>
    </a>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {/if}
</div>
