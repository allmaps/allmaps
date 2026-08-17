<script lang="ts">
  import {
    Image as ImageIcon,
    Images as ImagesIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import { Select } from '@allmaps/ui'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { m } from '$lib/paraglide/messages.js'

  type Props = {
    to?: HTMLElement
  }

  const { to }: Props = $props()

  const scopeState = getScopeState()

  let items = $derived(
    [
      { value: 'images' as const, label: m.all_images(), Icon: ImagesIcon },
      { value: 'image' as const, label: m.current_image(), Icon: ImageIcon },
      { value: 'map' as const, label: m.current_map(), Icon: MapTrifoldIcon }
    ].filter((items) => scopeState.scopes.includes(items.value))
  )
</script>

<Select {items} bind:value={scopeState.scope} {to} />
