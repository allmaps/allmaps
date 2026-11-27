<script lang="ts">
  import {
    Copy as CopyIcon,
    PencilSimple as PencilSimpleIcon
  } from 'phosphor-svelte'

  import { DropdownMenu } from 'bits-ui'
  import { resolve } from '$app/paths'
  import { getStarredResource } from '$lib/shared/starred.js'
  import { annotationsBaseUrl } from '$lib/shared/auth.js'
  import { getSourceState } from '$lib/state/source.svelte.js'

  import AnnotationMenuContent from './AnnotationMenuContent.svelte'
  import MenuItem from '$lib/components/menu/MenuItem.svelte'
  import MenuLinkItem from '$lib/components/menu/MenuLinkItem.svelte'
  import MenuSeparator from '$lib/components/menu/MenuSeparator.svelte'

  import {
    copyMapAnnotation,
    copyMapAnnotationUrl,
    getEditableMapEditorUrl,
    getMapAnnotationUrl,
    getMapAnnotationSource
  } from '$lib/shared/map-actions.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  type Props = {
    map: GeoreferencedMap
    isEmbedded?: boolean
    contextMenu?: boolean
  }

  let { map, isEmbedded = false, contextMenu = false }: Props = $props()

  const sourceState = getSourceState()
  let annotationUrl = $derived(getMapAnnotationUrl(map.id, isEmbedded))
  let openMapHref = $derived.by(() => {
    const current = sourceState.source
    if (
      !annotationUrl ||
      (current?.sourceType === 'url' &&
        (current.url === annotationUrl ||
          getStarredResource(current, annotationsBaseUrl)?.type === 'map' ||
          current.allmapsId?.startsWith('maps/')))
    )
      return
    return `${resolve('/(app)')}?${new URLSearchParams({ url: annotationUrl })}`
  })
  let source = $derived(getMapAnnotationSource(map.id, isEmbedded))
  let editorUrl = $derived(getEditableMapEditorUrl(map, isEmbedded))

  let sourceDescription = $derived.by(() => {
    if (source === 'allmaps') {
      return 'stored in the Allmaps database'
    } else if (source === 'embedded') {
      return 'embedded in the IIIF resource'
    }

    return 'hosted outside Allmaps'
  })

  async function handleCopyAnnotationUrl() {
    if (!map.id) {
      return
    }

    try {
      await copyMapAnnotationUrl(map.id, isEmbedded)
    } catch (error) {
      console.error('Failed to copy annotation URL:', error)
    }
  }

  async function handleCopyAnnotation() {
    try {
      await copyMapAnnotation(map)
    } catch (error) {
      console.error('Failed to copy annotation:', error)
    }
  }
</script>

{#snippet description()}
  This map's <a
    class="underline"
    href="https://iiif.io/api/extension/georef/"
    target="_blank"
    >Georeference Annotation
  </a>
  is
  {sourceDescription}
{/snippet}

{#if contextMenu}
  <DropdownMenu.Group>
    <DropdownMenu.GroupHeading
      class="text-xs leading-snug bg-gray-100/50 p-2 mx-px rounded w-58"
    >
      {@render description()}
    </DropdownMenu.GroupHeading>
    {#if openMapHref}
      <MenuLinkItem href={openMapHref} sameTab>Open only this map</MenuLinkItem>
    {/if}
    {#if editorUrl}
      <MenuLinkItem href={editorUrl}>
        {#snippet icon()}<PencilSimpleIcon class="size-4" />{/snippet}
        Edit in Allmaps Editor
      </MenuLinkItem>
    {/if}
    <MenuSeparator />
    <MenuLinkItem href={annotationUrl}>Open annotation</MenuLinkItem>
    <MenuItem onSelect={handleCopyAnnotationUrl} disabled={!annotationUrl}>
      <CopyIcon class="size-4" />Copy annotation URL
    </MenuItem>
    <MenuItem onSelect={handleCopyAnnotation}>
      <CopyIcon class="size-4" />Copy annotation
    </MenuItem>
  </DropdownMenu.Group>
{:else}
  <AnnotationMenuContent
    viewerHref={openMapHref}
    viewerLabel="Open only this map"
    editorHref={editorUrl}
    {annotationUrl}
    copyAnnotation={() => copyMapAnnotation(map)}
  >
    {@render description()}
  </AnnotationMenuContent>
{/if}
