<script lang="ts">
  import { hierarchy, treemap } from 'd3-hierarchy'
  import {
    blue,
    purple,
    orange,
    green,
    pink,
    darkblue,
    gray
  } from '@allmaps/tailwind'
  import type { StatisticsOrganizations } from '$lib/types.js'

  type Organization = StatisticsOrganizations['organizations'][number]
  type Tile = {
    id: string
    name: string
    value: number
    color: string
    other?: boolean
    organization?: Organization
    children?: Tile[]
  }
  let { distribution }: { distribution: StatisticsOrganizations } = $props()
  let metric = $state<'images' | 'maps'>('images')
  let width = $state(900)
  let offsets = $state([0])
  let selected = $state<Organization | null>(null)
  const palette = [blue, purple, orange, green, pink, darkblue]
  const count = (value: number) => value.toLocaleString('en')
  const color = (id: string) =>
    palette[
      Array.from(id).reduce(
        (hash, letter) => (hash * 31 + letter.charCodeAt(0)) >>> 0,
        0
      ) % palette.length
    ]
  let limit = $derived(width < 600 ? 10 : 25)
  let offset = $derived(offsets.at(-1) ?? 0)
  let organizations = $derived(
    distribution.organizations
      .filter((org) => org.id !== null && org[metric] > 0)
      .toSorted((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name))
  )
  let unassigned = $derived(
    distribution.organizations.find((org) => org.id === null)
  )
  let remaining = $derived(organizations.slice(offset + limit))
  let tiles: Tile[] = $derived([
    ...organizations.slice(offset, offset + limit).map((org) => ({
      id: org.id!,
      name: org.name,
      value: org[metric],
      color: color(org.id!),
      organization: org
    })),
    ...(remaining.length
      ? [
          {
            id: 'other',
            name: `Other (${remaining.length})`,
            value: remaining.reduce((sum, org) => sum + org[metric], 0),
            color: gray,
            other: true
          }
        ]
      : []),
    ...(offset === 0 && unassigned && unassigned[metric] > 0
      ? [
          {
            id: 'unassigned',
            name: 'Without organization',
            value: unassigned[metric],
            color: gray,
            organization: unassigned
          }
        ]
      : [])
  ])
  let height = $derived(Math.max(280, width * 0.52))
  let layout = $derived(
    treemap<Tile>()
      .size([width, height])
      .paddingInner(3)
      .round(true)(
        hierarchy<Tile>({
          id: 'root',
          name: '',
          value: 0,
          color: '',
          children: tiles
        }).sum((tile) => (tile.children ? 0 : tile.value))
      )
      .leaves()
  )
  let total = $derived(tiles.reduce((sum, tile) => sum + tile.value, 0))
</script>

<section
  class="space-y-4 rounded-xl border border-gray-200 bg-white p-5 font-sans"
  aria-label="Distribution by organization"
>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="text-xl font-semibold">By organization</h2>
    <label class="flex items-center gap-2 text-sm"
      >Show
      <select
        class="rounded border border-gray-300 bg-white p-2"
        bind:value={metric}
        onchange={() => {
          offsets = [0]
          selected = null
        }}
      >
        <option value="images">Images</option><option value="maps">Maps</option>
      </select>
    </label>
  </div>
  <p class="text-sm text-gray-600">
    Current snapshot. Each block's area shows its share of {metric}. Select a
    block for counts or open “Other” to see more organizations.
  </p>
  {#if offset > 0}
    <button
      class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
      onclick={() => {
        offsets = offsets.slice(0, -1)
        selected = null
      }}>← Back to previous group</button
    >
  {/if}
  <div
    bind:clientWidth={width}
    class="relative w-full overflow-hidden rounded-lg"
    style:height={`${height}px`}
  >
    {#each layout as tile (tile.data.id)}
      <button
        class="absolute overflow-hidden rounded-sm p-2 text-left text-white focus-visible:z-10 focus-visible:outline-4 focus-visible:outline-black"
        style:left={`${(tile.x0 / width) * 100}%`}
        style:top={`${tile.y0}px`}
        style:width={`${((tile.x1 - tile.x0) / width) * 100}%`}
        style:height={`${tile.y1 - tile.y0}px`}
        style:background-color={tile.data.color}
        title={`${tile.data.name}: ${count(tile.data.value)} ${metric} (${total ? ((100 * tile.data.value) / total).toFixed(1) : 0}%)`}
        aria-label={`${tile.data.name}: ${count(tile.data.value)} ${metric}${tile.data.other ? '. Show more organizations' : '. Show counts'}`}
        onclick={() => {
          if (tile.data.other) {
            offsets = [...offsets, offset + limit]
            selected = null
          } else {
            selected = tile.data.organization ?? null
          }
        }}
      >
        {#if tile.x1 - tile.x0 > 90 && tile.y1 - tile.y0 > 42}
          <span
            class="block text-sm font-semibold leading-tight [text-shadow:0_1px_3px_rgb(0_0_0/70%)]"
            >{tile.data.name}</span
          >
          {#if tile.y1 - tile.y0 > 65}<span
              class="mt-1 block text-xs tabular-nums [text-shadow:0_1px_3px_rgb(0_0_0/70%)]"
              >{count(tile.data.value)}</span
            >{/if}
        {/if}
      </button>
    {/each}
    {#if !tiles.length}<p class="p-4 text-sm text-gray-600">
        No {metric} in this snapshot.
      </p>{/if}
  </div>
  <div class="min-h-10 text-sm text-gray-700" aria-live="polite">
    {#if selected}<strong>{selected.name}</strong>: {count(selected.maps)} maps ·
      {count(selected.images)} images · {count(selected.georeferencedImages)} images
      georeferenced.
    {:else}{count(total)}
      {metric} in this view. Showing up to {limit} organizations{offset === 0
        ? ', plus unassigned records where applicable'
        : ' from the selected Other group'}.{/if}
  </div>
</section>
