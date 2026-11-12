<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- API resource links are external */
  import { resolve } from '$app/paths'
  import StatisticsCards from '$lib/components/StatisticsCards.svelte'
  import type { PageProps } from './$types'
  let { data }: PageProps = $props()
  const organization = $derived(data.organization)
  const isAdmin = $derived(
    data.session?.user?.role
      ?.split(',')
      .map((role) => role.trim())
      .includes('admin')
  )
  const apiUrl = $derived(
    `${data.env.PUBLIC_REST_BASE_URL}/organizations/${data.organizationId}`
  )
  const links = $derived([
    ['Organization details', apiUrl],
    ['Images', `${apiUrl}/images`],
    ['Manifests', `${apiUrl}/manifests`],
    ['Canvases', `${apiUrl}/canvases`],
    ['Images without georeference', `${apiUrl}/images?georeferenced=false`],
    ['Georeferenced images', `${apiUrl}/images?georeferenced=true`]
  ])
</script>

<div class="mx-auto max-w-5xl space-y-8 px-4 py-8">
  <header class="flex items-center justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold">{organization.name}</h1>
      <p class="mt-2 font-sans text-gray-500">
        {organization.domains.join(', ') || 'No domains configured'}
      </p>
    </div>
    {#if isAdmin}<a
        class="rounded border border-gray-300 px-4 py-2 font-sans"
        href={resolve('/organizations/[organizationId]/edit', {
          organizationId: data.organizationId
        })}>Edit organization</a
      >{/if}
  </header>
  <section aria-label="Statistics">
    <StatisticsCards statistics={data.statistics} />
  </section>
  <section>
    <h2 class="mb-3 text-xl font-semibold">API resources</h2>
    <ul class="space-y-2 font-sans">
      {#each links as [label, href] (label)}<li>
          <a class="text-blue-600 underline" {href}>{label}</a>
        </li>{/each}
    </ul>
    <p class="mt-3 font-sans text-sm text-gray-500">
      Image links use the API's existing georeference filter; the statistics
      above require a geographic footprint.
    </p>
  </section>
  <section>
    <h2 class="mb-3 text-xl font-semibold">Allmaps applications</h2>
    <ul class="space-y-2 font-sans text-gray-500">
      {#each ['Here', 'Editor', 'Explore', 'Latest'] as app (app)}<li>
          Allmaps {app} — organization view coming soon
        </li>{/each}
    </ul>
  </section>
</div>
