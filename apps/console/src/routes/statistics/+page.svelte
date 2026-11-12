<script lang="ts">
  import StatisticsCards from '$lib/components/StatisticsCards.svelte'
  import type { PageProps } from './$types'
  let { data }: PageProps = $props()
</script>

<div class="mx-auto max-w-5xl space-y-6 px-4 py-8">
  <h1 class="text-3xl font-bold">Allmaps statistics</h1>
  <StatisticsCards statistics={data.statistics} />
</div>
