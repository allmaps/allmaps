<script lang="ts">
  import type { Statistics } from '$lib/types.js'
  let { statistics }: { statistics: Statistics } = $props()
  const cards = $derived([
    {
      label: 'Maps',
      value: statistics.maps,
      accent: 'border-t-blue',
      description: 'in the current collection'
    },
    {
      label: 'Images',
      value: statistics.images,
      accent: 'border-t-purple',
      description: 'in the current collection'
    },
    {
      label: 'Manifests',
      value: statistics.manifests,
      accent: 'border-t-orange',
      description: 'known to Allmaps'
    }
  ])
  const count = (value: number) => value.toLocaleString('en')
</script>

<section class="space-y-4 font-sans" aria-label="Current statistics">
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each cards as card (card.label)}
      <div
        class={`rounded-xl border border-gray-200 border-t-4 bg-white p-5 ${card.accent}`}
      >
        <h2 class="text-sm text-gray-700">{card.label}</h2>
        <p class="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
          {count(card.value)}
        </p>
        <p class="mt-2 text-xs text-gray-600">{card.description}</p>
      </div>
    {/each}
    <div
      class="rounded-xl border border-gray-200 border-t-4 border-t-green bg-white p-5"
    >
      <h2 class="text-sm text-gray-700">Images georeferenced</h2>
      <p class="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {statistics.georeferencedPercentage === null
          ? '—'
          : `${statistics.georeferencedPercentage.toFixed(1)}%`}
      </p>
      <div
        class="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100"
        aria-hidden="true"
      >
        <div
          class="h-full rounded-full bg-green"
          style:width={`${Math.max(0, Math.min(100, statistics.georeferencedPercentage ?? 0))}%`}
        ></div>
      </div>
      <p class="mt-2 text-xs text-gray-600">
        {count(statistics.georeferencedImages)} of {count(statistics.images)} images
      </p>
    </div>
  </div>
  <div class="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
    <dl class="grid gap-4 text-sm sm:grid-cols-2">
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-gray-700">Images without georeference</dt>
        <dd class="font-medium tabular-nums">
          {count(statistics.ungeoreferencedImages)}
        </dd>
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-gray-700">Images without a manifest</dt>
        <dd class="font-medium tabular-nums">
          {count(statistics.imagesWithoutManifest)}
        </dd>
      </div>
    </dl>
    <p
      class="border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-600"
    >
      Daily snapshot of non-archived maps and images; changes appear after the
      next refresh. An image counts as georeferenced when a current map has a
      geographic footprint. Manifests are attributed by their own domain.
      Updated {new Date(statistics.measuredAt).toLocaleString('en')}.
    </p>
  </div>
</section>
