<script lang="ts">
  import StatisticsChart from './StatisticsChart.svelte'
  import type { StatisticsHistory } from '$lib/types.js'
  let { history }: { history: StatisticsHistory } = $props()
  const count = (value: number | null) =>
    value === null ? '—' : value.toLocaleString('en')
</script>

<section class="space-y-4 font-sans" aria-label="Statistics over time">
  <h2 class="text-xl font-semibold">Statistics over time</h2>
  <form method="GET" class="flex flex-wrap items-end gap-4 font-sans">
    <label class="flex flex-col gap-1 text-sm"
      >From<input
        class="rounded border border-gray-300 p-2"
        type="date"
        name="from"
        value={history.from}
        required
      /></label
    >
    <label class="flex flex-col gap-1 text-sm"
      >Through<input
        class="rounded border border-gray-300 p-2"
        type="date"
        name="through"
        value={history.through}
        required
      /></label
    >
    <label class="flex flex-col gap-1 text-sm"
      >Group by<select
        class="rounded border border-gray-300 p-2"
        name="interval"
        value={history.interval}
      >
        <option value="day">Day</option><option value="week">Week</option
        ><option value="month">Month</option><option value="year">Year</option>
      </select></label
    >
    <button class="rounded bg-blue px-4 py-2 text-white" type="submit"
      >Show statistics</button
    >
  </form>
  <p class="font-sans text-sm text-gray-500">
    Additions are inferred from retained records, not a complete edit log.
    Totals show the last recorded snapshot within each selected period. A dash
    means no historical snapshot is available. All dates use UTC; weeks start on
    Monday.
  </p>
  <div class="grid gap-4 md:grid-cols-2">
    <StatisticsChart {history} metric="mapsAdded" title="New maps" />
    <StatisticsChart {history} metric="imagesAdded" title="New images" />
    <StatisticsChart {history} metric="manifestsAdded" title="New manifests" />
    <StatisticsChart
      {history}
      metric="imagesFirstGeoreferenced"
      title="Images first georeferenced"
    />
  </div>
  <div class="overflow-x-auto rounded border border-gray-200">
    <table class="w-full text-left font-sans text-sm">
      <thead class="bg-gray-50"
        ><tr>
          {#each ['Period', 'New maps', 'New images', 'New manifests', 'First georeference', 'Maps', 'Images', 'Manifests', 'Without georeference', 'Without manifest', 'Snapshot date'] as heading (heading)}
            <th class="whitespace-nowrap px-3 py-3" scope="col">{heading}</th>
          {/each}
        </tr></thead
      >
      <tbody>
        {#each history.periods as row (row.period)}
          <tr class="border-t border-gray-100">
            <th class="whitespace-nowrap px-3 py-2 font-normal" scope="row"
              >{row.period}</th
            >
            {#each [row.mapsAdded, row.imagesAdded, row.manifestsAdded, row.imagesFirstGeoreferenced, row.maps, row.images, row.manifests, row.ungeoreferencedImages, row.imagesWithoutManifest] as value, index (index)}
              <td class="px-3 py-2 tabular-nums">{count(value)}</td>
            {/each}
            <td class="whitespace-nowrap px-3 py-2">{row.stockDay ?? '—'}</td>
          </tr>
        {:else}<tr
            ><td colspan="11" class="p-4 text-gray-500"
              >No statistics available for this selection.</td
            ></tr
          >{/each}
      </tbody>
    </table>
  </div>
</section>
