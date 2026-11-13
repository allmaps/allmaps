<script lang="ts">
  import StatisticsChart from './StatisticsChart.svelte'
  import { downloadStatistics } from '$lib/statistics-export.js'
  import type { StatisticsHistory } from '$lib/types.js'
  let { history }: { history: StatisticsHistory } = $props()
</script>

<section class="space-y-4 font-sans" aria-label="Statistics over time">
  <div class="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
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
          ><option value="month">Month</option><option value="year">Year</option
          >
        </select></label
      >
      <button class="rounded bg-blue px-4 py-2 text-white" type="submit"
        >Show statistics</button
      >
    </form>
    <p class="font-sans text-sm text-gray-500">
      Additions are inferred from retained records, not a complete edit log.
      Choose a date range and group by day, week, month or year. All dates use
      UTC; weeks start on Monday.
    </p>
  </div>
  <div class="flex flex-wrap justify-end gap-3 text-sm">
    <button
      class="rounded border border-gray-300 bg-white px-3 py-2 hover:bg-gray-100"
      onclick={() => downloadStatistics(history, 'csv')}>Download CSV</button
    >
    <button
      class="rounded border border-gray-300 bg-white px-3 py-2 hover:bg-gray-100"
      onclick={() => downloadStatistics(history, 'ndjson')}
      >Download NDJSON</button
    >
  </div>
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
</section>
