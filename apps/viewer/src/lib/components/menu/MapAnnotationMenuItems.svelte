<script lang="ts">
  import {
    Copy as CopyIcon,
    PencilSimple as PencilSimpleIcon
  } from 'phosphor-svelte'

  import { DropdownMenu } from 'bits-ui'

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
  }

  let { map, isEmbedded = false }: Props = $props()

  let annotationUrl = $derived(getMapAnnotationUrl(map.id, isEmbedded))
  let source = $derived(getMapAnnotationSource(map.id, isEmbedded))
  let editorUrl = $derived(getEditableMapEditorUrl(map, isEmbedded))

  let sourceDescription = $derived.by(() => {
    if (source === 'allmaps') {
      return 'stored in the Allmaps database'
    } else if (source === 'embedded') {
      return 'embedded the IIIF resource'
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

<DropdownMenu.Group>
  <DropdownMenu.GroupHeading
    class="text-xs leading-snug bg-gray-100/50 p-2 mx-px rounded w-58"
  >
    THis map's <a
      class="underline"
      href="https://iiif.io/api/extension/georef/"
      target="_blank"
      >Georeference Annotation
    </a>
    is
    {sourceDescription}
  </DropdownMenu.GroupHeading>

  <MenuItem onSelect={handleCopyAnnotationUrl} disabled={!annotationUrl}>
    <CopyIcon class="size-4" />
    <span>Copy annotation URL</span>
  </MenuItem>

  <MenuItem onSelect={handleCopyAnnotation}>
    <CopyIcon class="size-4" />
    <span>Copy annotation</span>
  </MenuItem>

  {#if annotationUrl || editorUrl}
    {#if annotationUrl}
      <MenuLinkItem href={annotationUrl}>Open in new tab</MenuLinkItem>
    {/if}
    <MenuSeparator />

    {#if editorUrl}
      <MenuLinkItem href={editorUrl}>
        {#snippet icon()}
          <PencilSimpleIcon class="size-4" />
        {/snippet}
        Edit in Allmaps Editor
      </MenuLinkItem>
    {/if}
  {/if}
</DropdownMenu.Group>
