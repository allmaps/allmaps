<script lang="ts">
  import { Logo } from '@allmaps/ui'

  import {
    PencilSimple as PencilSimpleIcon,
    CirclesThree as CirclesThreeIcon,
    Eye as EyeIcon,
    EyeSlash as EyeSlashIcon,
    Function as FunctionIcon,
    Globe as GlobeIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import MapRowMenu from '../../menu/MapRowMenu.svelte'

  import type { MapListRow } from './types.js'

  type Props = {
    row: MapListRow
    selected?: boolean
    hidden?: boolean
    canToggleHidden?: boolean
    onToggleHidden: (row: MapListRow) => void
  }

  let {
    row,
    selected = false,
    hidden = false,
    canToggleHidden = false,
    onToggleHidden
  }: Props = $props()

  function handleToggleHidden() {
    onToggleHidden(row)
  }
</script>

<div
  class={[
    'flex min-w-0 flex-1 flex-col gap-3 border border-gray-200 p-2 rounded-lg bg-white transition-all',
    selected && 'border-pink'
  ]}
>
  <div
    class="grid grid-cols-[min-content_1fr_min-content] min-w-0 items-center gap-3"
  >
    <h4
      class={[
        'truncate text-sm font-medium flex items-center gap-2 transition-all',
        selected && 'text-pink'
      ]}
    >
      <MapTrifoldIcon
        class="size-6 inline-block"
        weight={selected ? 'duotone' : 'regular'}
      />
      {row.title}
    </h4>
    <span class="text-xs opacity-75">
      <span class="hidden sm:inline">Last edit on {row.modifiedLabel}</span>
    </span>
    {#if canToggleHidden}
      <button
        type="button"
        class={[
          'cursor-pointer inline-flex p-0.5 pl-1.5 h-6 items-center gap-1.5 rounded-full text-xs transition-all text-black/80 hover:bg-gray-100 hover:text-gray-900 border-gray',
          hidden && 'bg-gray-100'
        ]}
        onclick={handleToggleHidden}
        aria-label={hidden ? 'Show map' : 'Hide map'}
      >
        {#if hidden}
          <span>Hidden</span>
          <EyeSlashIcon class="size-5" />
        {:else}
          <span>Visible</span>
          <EyeIcon class="size-5" />
        {/if}
      </button>
    {/if}
  </div>

  <div
    class="grid
      grid-cols-[min-content_1fr] grid-rows-4
      sm:grid-cols-[min-content_1fr_min-content_1fr] sm:grid-rows-2
      items-start gap-x-3 gap-y-2 text-xs"
  >
    <div class="contents sm:hidden">
      <PencilSimpleIcon class="size-4 inline-block " />
      <span class="text-xs opacity-75">
        Last edit on {row.modifiedLabel}
      </span>
    </div>

    <CirclesThreeIcon class="size-4 inline-block " />
    <span>
      {row.gcpCountLabel}
    </span>

    <FunctionIcon class="size-4 inline-block " />
    <span>
      {row.transformationLabel}
    </span>

    <GlobeIcon class="size-4 inline-block " />
    <span>
      {row.resourceCrsLabel}
    </span>

    <div class="size-4 opacity-60">
      <Logo />
    </div>
    <MapRowMenu map={row.map} isEmbedded={row.isEmbedded} />
  </div>
</div>
