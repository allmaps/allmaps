<script lang="ts">
  import {
    Image as ImageIcon,
    Images as ImagesIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import { Select } from '@allmaps/components'

  import { getScopeState } from '$lib/state/scope.svelte.js'

  const scopeState = getScopeState()

  const items = [
    { value: 'images' as const, label: 'All images', Icon: ImagesIcon },
    { value: 'image' as const, label: 'Current image', Icon: ImageIcon },
    { value: 'map' as const, label: 'Current map', Icon: MapTrifoldIcon }
  ]
</script>

<Select {items} bind:value={scopeState.scope} type="single" />
