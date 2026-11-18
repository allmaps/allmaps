<script lang="ts">
  import { scaleBand, scaleLinear, scaleUtc } from 'd3-scale'
  import { fade } from 'svelte/transition'
  import { prefersReducedMotion } from 'svelte/motion'
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
  let rows = $derived.by(() => {
    if (history.view !== 'cumulative') return history.periods
    let sum = 0
    return history.periods.map((row) => ({
      ...row,
      [metric]: (sum += row[metric])
    }))
  })
  let dates = $derived(rows.map((row) => date(row.period)))
  let start = $derived(dates[0] ?? date(history.from))
  let end = $derived(dates.at(-1) ?? date(history.through))
  let x = $derived(
    scaleUtc()
      .domain([start, +start === +end ? new Date(+end + 86400000) : end])
      .range([margin.left, width - margin.right])
  )
  let bars = $derived(
    scaleBand<string>()
      .domain(rows.map((row) => row.period))
      .range([margin.left, width - margin.right])
      .padding(0.2)
  )
  let ticks = $derived(
    history.view === 'cumulative'
      ? x
          .ticks(3)
          .map((value) => ({
            key: +value,
            x: x(value),
            label: formatDate(value)
          }))
      : [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])]
          .filter((index) => index >= 0 && index < rows.length)
          .map((index) => ({
            key: +date(rows[index].period),
            x: bars(rows[index].period)! + bars.bandwidth() / 2,
            label: formatDate(date(rows[index].period))
          }))
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
  let total = $derived(
    history.periods.reduce((sum, row) => sum + row[metric], 0)
  )
</script>

<figure
  class="min-w-0 rounded-xl border border-gray-200 bg-white p-5 font-sans"
>
  <figcaption class="flex flex-wrap items-baseline justify-between gap-2">
    <span class="font-semibold"
      >{title}{history.view === 'cumulative' ? ' · cumulative' : ''}</span
    >
    <span class="font-sans text-sm tabular-nums text-gray-600"
      >{total.toLocaleString('en')} in selection</span
    >
  </figcaption>
  <div class="grid">
    {#key `${history.from}:${history.through}:${history.interval}:${history.view ?? 'period'}`}
      {#if rows.length}
        <svg
          in:fade={{ duration: prefersReducedMotion.current ? 0 : 220 }}
          out:fade={{ duration: prefersReducedMotion.current ? 0 : 120 }}
          viewBox={`0 0 ${width} ${height}`}
          class="col-start-1 row-start-1 mt-2 w-full font-sans"
          role="img"
          aria-label={`${title}${history.view === 'cumulative' ? ' cumulative within the selection' : ''} per ${history.interval}, from ${history.from} through ${history.through}. ${total.toLocaleString('en')} in this selection.`}
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
          {#each ticks as tick (tick.key)}
            <text
              x={tick.x}
              y={height - 10}
              text-anchor="middle"
              font-size="11"
              class="fill-gray-700">{tick.label}</text
            >
          {/each}
          {#if history.view === 'cumulative'}
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
                  ><title
                    >{row.period}: {row[metric].toLocaleString('en')}</title
                  ></circle
                >
              {/each}
            {/if}
          {:else}
            {#each rows as row (row.period)}
              <rect
                x={bars(row.period)}
                y={y(row[metric])}
                width={bars.bandwidth()}
                height={Math.max(0, y(0) - y(row[metric]))}
                rx="1.5"
                fill={color}
              >
                <title>{row.period}: {row[metric].toLocaleString('en')}</title>
              </rect>
            {/each}
          {/if}
        </svg>
      {:else}
        <p
          class="col-start-1 row-start-1 py-12 text-center font-sans text-sm text-gray-500"
        >
          No statistics for this selection.
        </p>
      {/if}
    {/key}
  </div>
</figure>
