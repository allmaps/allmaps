<script lang="ts">
  import {
    Image as ImageIcon,
    Images as ImagesIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import { Select } from '@allmaps/components'

  import { getScopeState } from '$lib/state/scope.svelte.js'

  const scopeState = getScopeState()

  let items = $derived(
    [
      { value: 'images' as const, label: 'All images', Icon: ImagesIcon },
      { value: 'image' as const, label: 'Current image', Icon: ImageIcon },
      { value: 'map' as const, label: 'Current map', Icon: MapTrifoldIcon }
    ].filter((items) => scopeState.scopes.includes(items.value))
  )
</script>

<Select {items} bind:value={scopeState.scope} />
