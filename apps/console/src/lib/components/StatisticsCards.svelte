<script lang="ts">
  import type { Statistics } from '$lib/types.js'
  let { statistics }: { statistics: Statistics } = $props()
  const cards = $derived([
    ['Maps', statistics.maps],
    ['Images', statistics.images],
    ['Manifests', statistics.manifests],
    ['Images without a manifest', statistics.imagesWithoutManifest],
    ['Georeferenced images', statistics.georeferencedImages],
    [
      'Images georeferenced',
      statistics.georeferencedPercentage === null
        ? '—'
        : `${statistics.georeferencedPercentage.toFixed(1)}%`
    ]
  ])
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#each cards as [label, value] (label)}
    <div class="rounded-xl border border-gray-200 bg-white p-5">
      <p class="font-sans text-sm text-gray-500">{label}</p>
      <p class="mt-2 font-sans text-3xl font-semibold">
        {typeof value === 'number' ? value.toLocaleString('en') : value}
      </p>
    </div>
  {/each}
</div>
<p class="mt-3 font-sans text-sm text-gray-500">
  Current, non-archived maps and images. An image counts as georeferenced when a
  current map has a geographic footprint. Manifests are attributed by their own
  domain. Updated {new Date(statistics.measuredAt).toLocaleString('en')}.
</p>
