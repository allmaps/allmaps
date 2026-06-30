<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import { CaretDown as CaretDownIcon } from 'phosphor-svelte'

  import MapAnnotationMenuItems from '$lib/components/menu/MapAnnotationMenuItems.svelte'
  import MenuContent from '$lib/components/menu/MenuContent.svelte'
  import {
    getAllmapsAnnotationMapId,
    getMapAnnotationSource,
    getMapAnnotationUrl
  } from '$lib/shared/map-actions.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  type Props = {
    map: GeoreferencedMap
    isEmbedded?: boolean
  }

  let { map, isEmbedded = false }: Props = $props()

  let allmapsMapId = $derived(getAllmapsAnnotationMapId(map.id))
  let annotationSource = $derived(getMapAnnotationSource(map.id, isEmbedded))
  let annotationUrl = $derived(getMapAnnotationUrl(map.id, isEmbedded))
  let annotationSourceLabelText = $derived.by(() => {
    if (annotationSource === 'allmaps') {
      return allmapsMapId
    } else if (annotationSource === 'embedded') {
      return 'Embedded'
    }

    return 'External'
  })
</script>

{#snippet sourceLabel()}
  <span class={[annotationSource === 'allmaps' && 'font-mono']}>
    {annotationSourceLabelText}
  </span>
{/snippet}

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="inline-flex py-1 -ml-2 -mt-0.5 min-w-0 cursor-pointer items-center justify-between gap-1.5 truncate rounded-full bg-gray-100/50 px-2 text-xs transition-colors hover:bg-gray-100 hover:text-black text-gray-700"
    title={annotationUrl}
  >
    {@render sourceLabel()}
    <CaretDownIcon class="size-3.5" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <MenuContent side="bottom" align="start" sideOffset={4}>
      <MapAnnotationMenuItems {map} {isEmbedded} />
    </MenuContent>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
