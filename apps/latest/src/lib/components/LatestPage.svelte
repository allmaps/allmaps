<script lang="ts">
  import { page } from '$app/state'
  import { Stats } from '@allmaps/ui'
  import { Latest } from '@allmaps/ui/latest'

  import { mapsApiBaseUrl, annotationsApiBaseUrl } from '$lib/config.js'
  import type { PartnerOrganization } from '$lib/organization.js'

  let { organization }: { organization?: PartnerOrganization } = $props()

  const DEFAULT_LIMIT = 100
  let urlLimit = $derived(
    Number(page.url.searchParams.get('limit')) || DEFAULT_LIMIT
  )
  let limit = $derived(Math.max(1, urlLimit))
  let title = $derived(
    organization ? `Allmaps Latest – ${organization.name}` : 'Allmaps Latest'
  )
  let description = $derived(
    `The latest maps${organization ? ` from ${organization.name}` : ''} georeferenced with Allmaps Editor`
  )
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta
    property="og:url"
    content={`https://latest.allmaps.org${page.url.pathname}`}
  />
</svelte:head>

<Stats />
<main class="p-3">
  {#key `${organization?.slug ?? ''}:${limit}`}
    <Latest
      count={limit}
      {mapsApiBaseUrl}
      {annotationsApiBaseUrl}
      organizationSlug={organization?.slug}
      organizationName={organization?.name}
      showHeader={true}
    />
  {/key}
</main>
