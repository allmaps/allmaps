<script lang="ts">
  import Organization from '$lib/components/Organization.svelte'
  import { getExamplesState } from '$lib/state/examples.svelte.js'
  import {
    HOMEPAGE_EXAMPLES_COUNT,
    HOMEPAGE_ORGANIZATION_COUNT
  } from '$lib/shared/examples.js'
  import { m } from '$lib/paraglide/messages.js'

  import type {
    ApiOrganization,
    ExamplesByOrganizationId
  } from '$lib/shared/examples.js'

  type Props = {
    organizations: ApiOrganization[]
    examplesByOrganizationId: ExamplesByOrganizationId
  }

  let { organizations, examplesByOrganizationId }: Props = $props()

  let visibleCount = $state(HOMEPAGE_ORGANIZATION_COUNT)
  let loadingMoreOrganizations = $state(false)

  const visibleOrganizations = $derived(organizations.slice(0, visibleCount))
  const hasMoreOrganizations = $derived(visibleCount < organizations.length)
  const examplesState = getExamplesState()

  // svelte-ignore state_referenced_locally
  examplesState.setOrganizations(organizations)
  // svelte-ignore state_referenced_locally
  examplesState.setExamplesByOrganizationId(examplesByOrganizationId)

  async function showMoreOrganizations() {
    const nextOrganizations = organizations.slice(
      visibleCount,
      visibleCount + HOMEPAGE_ORGANIZATION_COUNT
    )

    if (nextOrganizations.length === 0) {
      return
    }

    loadingMoreOrganizations = true

    try {
      await examplesState.fetchExamplesByOrganizations(
        nextOrganizations,
        HOMEPAGE_EXAMPLES_COUNT
      )
      visibleCount += HOMEPAGE_ORGANIZATION_COUNT
    } catch (error) {
      console.error('Failed to fetch more organization examples', error)
    } finally {
      loadingMoreOrganizations = false
    }
  }
</script>

{#if organizations.length === 0}
  <p class="p-8 text-sm text-gray-500">{m.no_results_found()}</p>
{:else}
  <ul class="flex flex-col gap-8">
    {#each visibleOrganizations as organization (organization.id)}
      <li class="contents">
        <Organization
          {organization}
          count={HOMEPAGE_EXAMPLES_COUNT}
          examples={examplesState.getExamplesByOrganization(organization)}
          showMoreLink={true}
        />
      </li>
    {/each}
  </ul>

  {#if hasMoreOrganizations}
    <button
      type="button"
      class="mt-8 rounded-full bg-pink px-4 py-2 font-bold text-white shadow-none transition-all hover:bg-pink/90 hover:shadow-md disabled:cursor-wait disabled:opacity-60"
      disabled={loadingMoreOrganizations}
      aria-busy={loadingMoreOrganizations}
      onclick={showMoreOrganizations}
    >
      {loadingMoreOrganizations
        ? m.loading_ellipsis()
        : m.show_more_collections()}
    </button>
  {/if}
{/if}
