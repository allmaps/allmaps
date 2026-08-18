<script lang="ts">
  import Organization from '$lib/components/Organization.svelte'
  import { getExamplesState } from '$lib/state/examples.svelte.js'
  import {
    HOMEPAGE_EXAMPLES_COUNT,
    HOMEPAGE_ORGANIZATION_COUNT
  } from '$lib/shared/examples.js'
  import { m } from '$lib/paraglide/messages.js'

  import type { ApiOrganization } from '$lib/shared/examples.js'

  type Props = {
    organizations: ApiOrganization[]
  }

  let { organizations }: Props = $props()

  let visibleCount = $state(HOMEPAGE_ORGANIZATION_COUNT)

  const visibleOrganizations = $derived(organizations.slice(0, visibleCount))
  const hasMoreOrganizations = $derived(visibleCount < organizations.length)
  const examplesState = getExamplesState()

  // svelte-ignore state_referenced_locally
  examplesState.setOrganizations(organizations)
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
          showMoreLink={true}
        />
      </li>
    {/each}
  </ul>

  {#if hasMoreOrganizations}
    <button
      type="button"
      class="mt-8 rounded-full bg-pink px-4 py-2 font-bold text-white shadow-none transition-all hover:bg-pink/90 hover:shadow-md"
      onclick={() => (visibleCount += HOMEPAGE_ORGANIZATION_COUNT)}
    >
      {m.show_more_collections()}
    </button>
  {/if}
{/if}
