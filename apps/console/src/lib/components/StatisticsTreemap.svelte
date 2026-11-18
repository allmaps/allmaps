<script lang="ts">
  import { tick } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { hierarchy, treemap } from 'd3-hierarchy'
  import { blue } from '@allmaps/tailwind'
  import {
    fullZoomBox,
    zoomEnter,
    zoomExit,
    type ZoomBox
  } from '$lib/treemap-motion.js'
  import type { StatisticsOrganizations } from '$lib/types.js'

  type Organization = StatisticsOrganizations['organizations'][number]
  type Tile = {
    id: string
    name: string
    value: number
    georeferenced: number
    other?: boolean
    organization?: Organization
    children?: Tile[]
  }
  let { distribution }: { distribution: StatisticsOrganizations } = $props()
  const tooltipId = $props.id()
  let metric = $state<'images' | 'maps'>('images')
  let width = $state(900)
  let levels = $state([{ offset: 0, box: fullZoomBox }])
  let selected = $state<Organization | null>(null)
  let activeId = $state<string | null>(null)
  let direction = $state<'forward' | 'back' | 'reset'>('reset')
  let zoomBox = $state<ZoomBox>(fullZoomBox)
  let animating = $state(false)
  let layer = $state<HTMLDivElement>()
  const count = (value: number) => value.toLocaleString('en')
  const percentage = (value: number, total: number) =>
    total ? Math.max(0, Math.min(100, (100 * value) / total)) : 0
  const progress = (tile: Tile) => percentage(tile.georeferenced, tile.value)
  let limit = $derived(width < 600 ? 10 : 25)
  let offset = $derived(levels.at(-1)?.offset ?? 0)
  let organizations = $derived(
    distribution.organizations
      .filter((org) => org.id !== null && org[metric] > 0)
      .toSorted((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name))
  )
  let unassigned = $derived(
    distribution.organizations.find((org) => org.id === null)
  )
  let remaining = $derived(organizations.slice(offset + limit))
  const organizationTile = (org: Organization): Tile => ({
    id: org.id ?? 'unassigned',
    name: org.name,
    value: org[metric],
    georeferenced: org.georeferencedImages,
    organization: org
  })
  let tiles: Tile[] = $derived([
    ...organizations.slice(offset, offset + limit).map(organizationTile),
    ...(remaining.length
      ? [
          {
            id: 'other',
            name: `Other (${remaining.length})`,
            value: remaining.reduce((sum, org) => sum + org[metric], 0),
            georeferenced: remaining.reduce(
              (sum, org) => sum + org.georeferencedImages,
              0
            ),
            other: true
          }
        ]
      : []),
    ...(offset === 0 && unassigned && unassigned[metric] > 0
      ? [organizationTile(unassigned)]
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
          georeferenced: 0,
          children: tiles
        }).sum((tile) => (tile.children ? 0 : tile.value))
      )
      .leaves()
  )
  let active = $derived(layout.find((tile) => tile.data.id === activeId))
  let total = $derived(tiles.reduce((sum, tile) => sum + tile.value, 0))
  let tooltipWidth = $derived(Math.min(260, Math.max(0, width - 16)))
  let tooltipX = $derived(
    active
      ? Math.max(
          tooltipWidth / 2,
          Math.min(width - tooltipWidth / 2, (active.x0 + active.x1) / 2)
        )
      : 0
  )
  let tooltipAbove = $derived(active ? active.y0 > 95 : true)

  function reset() {
    levels = [{ offset: 0, box: fullZoomBox }]
    selected = null
    activeId = null
    direction = 'reset'
    zoomBox = fullZoomBox
  }
  function openOther(tile: (typeof layout)[number]) {
    if (animating || tile.x1 <= tile.x0 || tile.y1 <= tile.y0) return
    zoomBox = {
      x: tile.x0 / width,
      y: tile.y0 / height,
      width: (tile.x1 - tile.x0) / width,
      height: (tile.y1 - tile.y0) / height
    }
    direction = 'forward'
    animating = true
    activeId = null
    selected = null
    levels = [...levels, { offset: offset + limit, box: zoomBox }]
  }
  function back() {
    if (animating || levels.length === 1) return
    zoomBox = levels.at(-1)!.box
    direction = 'back'
    animating = true
    activeId = null
    selected = null
    levels = levels.slice(0, -1)
  }
  async function finishZoom() {
    if (!animating) return
    animating = false
    await tick()
    layer
      ?.querySelector<HTMLButtonElement>(
        direction === 'back' ? '[data-other="true"]' : 'button'
      )
      ?.focus({ preventScroll: true })
  }
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
        onchange={reset}
        disabled={animating}
      >
        <option value="images">Images</option><option value="maps">Maps</option>
      </select>
    </label>
  </div>
  <p class="text-sm text-gray-600">
    Current snapshot. Each block's area shows its share of {metric}. Select a
    block for counts or open “Other” to see more organizations.
  </p>
  {#if metric === 'images'}
    <div
      class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700"
      aria-label="Georeferencing legend"
    >
      <span class="flex items-center gap-2"
        ><span
          class="h-3 w-3 rounded-sm"
          style:background-color={blue}
          aria-hidden="true"
        ></span>Georeferenced</span
      >
      <span class="flex items-center gap-2"
        ><span
          class="h-3 w-3 rounded-sm"
          style:background-color={blue}
          style:opacity={0.18}
          aria-hidden="true"
        ></span>Without georeference</span
      >
    </div>
  {/if}
  {#if offset > 0}<button
      class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
      onclick={back}
      disabled={animating}>← Back to previous group</button
    >{/if}
  <div class="relative">
    <div
      bind:clientWidth={width}
      class="relative w-full overflow-hidden rounded-lg"
      style:height={`${height}px`}
    >
      {#key `${metric}:${offset}`}
        <div
          bind:this={layer}
          class="absolute inset-0"
          in:zoomEnter={{
            box: zoomBox,
            direction,
            reducedMotion: prefersReducedMotion.current
          }}
          out:zoomExit={{
            box: zoomBox,
            direction,
            reducedMotion: prefersReducedMotion.current
          }}
          onintroend={finishZoom}
        >
          {#each layout as tile (tile.data.id)}
            <button
              class="absolute overflow-hidden rounded-sm bg-white text-left text-black focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-black focus-visible:-outline-offset-3"
              style:left={`${(tile.x0 / width) * 100}%`}
              style:top={`${tile.y0}px`}
              style:width={`${((tile.x1 - tile.x0) / width) * 100}%`}
              style:height={`${tile.y1 - tile.y0}px`}
              data-other={tile.data.other ? 'true' : undefined}
              disabled={animating}
              aria-label={`${tile.data.name}: ${count(tile.data.value)} ${metric}${metric === 'images' ? `, ${progress(tile.data).toFixed(1)}% georeferenced` : ''}${tile.data.other ? '. Show more organizations' : '. Show counts'}`}
              aria-describedby={activeId === tile.data.id
                ? tooltipId
                : undefined}
              onpointerenter={() => {
                if (!animating) activeId = tile.data.id
              }}
              onpointerleave={(event) => {
                if (!event.currentTarget.matches(':focus-visible'))
                  activeId = null
              }}
              onfocus={() => {
                if (!animating) activeId = tile.data.id
              }}
              onblur={() => {
                if (activeId === tile.data.id) activeId = null
              }}
              onkeydown={(event) => {
                if (event.key === 'Escape') {
                  activeId = null
                  event.stopPropagation()
                }
              }}
              onclick={() => {
                if (tile.data.other) openOther(tile)
                else {
                  selected = tile.data.organization ?? null
                  activeId = tile.data.id
                }
              }}
            >
              <span
                class="pointer-events-none absolute inset-0"
                style:background-color={blue}
                style:opacity={metric === 'images' ? 0.18 : 1}
              ></span>
              {#if metric === 'images'}<span
                  class="pointer-events-none absolute inset-y-0 left-0"
                  style:background-color={blue}
                  style:width={`${progress(tile.data)}%`}
                ></span>{/if}
              <span
                class="pointer-events-none absolute inset-0 flex min-w-0 flex-col justify-center px-1.5"
              >
                <span class="block truncate text-xs font-semibold leading-tight"
                  >{tile.data.name}</span
                >
                {#if tile.y1 - tile.y0 > 48 && tile.x1 - tile.x0 > 70}<span
                    class="mt-1 block truncate text-xs tabular-nums"
                    >{metric === 'images'
                      ? `${progress(tile.data).toFixed(1)}% georeferenced`
                      : count(tile.data.value)}</span
                  >{/if}
              </span>
            </button>
          {/each}
          {#if !tiles.length}<p class="p-4 text-sm text-gray-600">
              No {metric} in this snapshot.
            </p>{/if}
        </div>
      {/key}
    </div>
    {#if active && !animating}
      <div
        id={tooltipId}
        role="tooltip"
        class="pointer-events-none absolute z-20 rounded-lg bg-black px-3 py-2 text-sm text-white shadow-lg"
        style:width={`${tooltipWidth}px`}
        style:left={`${tooltipX}px`}
        style:top={`${tooltipAbove ? active.y0 - 8 : active.y1 + 8}px`}
        style:transform={`translate(-50%,${tooltipAbove ? '-100%' : '0'})`}
      >
        <strong class="block break-words">{active.data.name}</strong>
        <span class="block"
          >{count(active.data.value)}
          {metric} · {percentage(active.data.value, total).toFixed(1)}% of this
          view</span
        >
        {#if metric === 'images'}<span class="block"
            >{count(active.data.georeferenced)} georeferenced ({progress(
              active.data
            ).toFixed(1)}%)</span
          >{/if}
        {#if active.data.other}<span class="block text-xs"
            >Select to see more organizations</span
          >{/if}
      </div>
    {/if}
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
