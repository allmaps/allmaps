<script lang="ts">
  import { scaleLinear, scaleUtc } from 'd3-scale'
  import { line } from 'd3-shape'
  import { blue, purple, orange, green } from '@allmaps/tailwind'
  import type { StatisticsHistory } from '$lib/types.js'

  type Period = StatisticsHistory['periods'][number]
  type Metric =
    'mapsAdded' | 'imagesAdded' | 'manifestsAdded' | 'imagesFirstGeoreferenced'
  let {
    history,
    metric,
    title
  }: { history: StatisticsHistory; metric: Metric; title: string } = $props()
  const colors: Record<Metric, string> = {
    mapsAdded: blue,
    imagesAdded: purple,
    manifestsAdded: orange,
    imagesFirstGeoreferenced: green
  }
  let color = $derived(colors[metric])
  const width = 520
  const height = 230
  const margin = { top: 16, right: 18, bottom: 36, left: 60 }
  const date = (period: string) => new Date(`${period}T00:00:00Z`)
  const formatDate = (value: Date) =>
    new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      timeZone: 'UTC'
    }).format(value)
  const number = new Intl.NumberFormat('en', { notation: 'compact' })
  let rows = $derived(history.periods)
  let dates = $derived(rows.map((row) => date(row.period)))
  let start = $derived(dates[0] ?? date(history.from))
  let end = $derived(dates.at(-1) ?? date(history.through))
  let x = $derived(
    scaleUtc()
      .domain([start, +start === +end ? new Date(+end + 86400000) : end])
      .range([margin.left, width - margin.right])
  )
  let y = $derived(
    scaleLinear()
      .domain([0, Math.max(1, ...rows.map((row) => row[metric]))])
      .nice()
      .range([height - margin.bottom, margin.top])
  )
  let path = $derived(
    line<Period>()
      .x((row) => x(date(row.period)))
      .y((row) => y(row[metric]))(rows)
  )
  let total = $derived(rows.reduce((sum, row) => sum + row[metric], 0))
</script>

<figure
  class="min-w-0 rounded-xl border border-gray-200 bg-white p-5 font-sans"
>
  <figcaption class="flex flex-wrap items-baseline justify-between gap-2">
    <span class="font-semibold">{title}</span>
    <span class="font-sans text-sm tabular-nums text-gray-600"
      >{total.toLocaleString('en')} in selection</span
    >
  </figcaption>
  {#if rows.length}
    <svg
      viewBox={`0 0 ${width} ${height}`}
      class="mt-2 w-full font-sans"
      role="img"
      aria-label={`${title} per ${history.interval}, from ${history.from} through ${history.through}. ${total.toLocaleString('en')} in this selection.`}
    >
      <title>{title}</title>
      {#each y.ticks(4).filter(Number.isInteger) as tick (tick)}
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={y(tick)}
          y2={y(tick)}
          class="stroke-gray-200"
        />
        <text
          x={margin.left - 10}
          y={y(tick)}
          dy="0.35em"
          text-anchor="end"
          font-size="12"
          class="fill-gray-700">{number.format(tick)}</text
        >
      {/each}
      {#each x.ticks(3) as tick (+tick)}
        <text
          x={x(tick)}
          y={height - 10}
          text-anchor="middle"
          font-size="11"
          class="fill-gray-700">{formatDate(tick)}</text
        >
      {/each}
      <path
        d={path ?? ''}
        fill="none"
        stroke={color}
        stroke-width="3.5"
        stroke-linejoin="round"
      />
      {#if rows.length <= 90}
        {#each rows as row (row.period)}
          <circle
            cx={x(date(row.period))}
            cy={y(row[metric])}
            r="3"
            fill={color}
            ><title>{row.period}: {row[metric].toLocaleString('en')}</title
            ></circle
          >
        {/each}
      {/if}
    </svg>
  {:else}
    <p class="py-12 text-center font-sans text-sm text-gray-500">
      No statistics for this selection.
    </p>
  {/if}
</figure>
