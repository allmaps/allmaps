<script lang="ts">
  import { onMount } from 'svelte'

  import Organization from '$lib/components/Organization.svelte'
  import { getExamplesState } from '$lib/state/examples.svelte.js'
  import {
    HOMEPAGE_EXAMPLES_COUNT,
    HOMEPAGE_ORGANIZATION_COUNT
  } from '$lib/shared/examples.js'
  import { m } from '$lib/paraglide/messages.js'

  const examplesState = getExamplesState()
  const organizationPlaceholderIndexes = Array.from(
    { length: HOMEPAGE_ORGANIZATION_COUNT },
    (_, index) => index
  )
  const examplePlaceholderIndexes = Array.from(
    { length: HOMEPAGE_EXAMPLES_COUNT },
    (_, index) => index
  )

  async function showMoreOrganizations() {
    try {
      await examplesState.showMoreHomepageOrganizations()
    } catch (error) {
      console.error('Failed to fetch more organization examples', error)
    }
  }

  onMount(() => {
    void examplesState.loadHomepageExamples().catch((error) => {
      console.error('Failed to fetch homepage examples', error)
    })
  })
</script>

{#if examplesState.homepagePending && examplesState.organizations.length === 0}
  <span class="sr-only">{m.loading_ellipsis()}</span>
  <ul class="flex w-full flex-col gap-8" aria-hidden="true">
    {#each organizationPlaceholderIndexes as organizationIndex (organizationIndex)}
      <li
        class="grid auto-rows-auto grid-cols-2 gap-8 rounded-2xl bg-white p-4 shadow-md md:grid-cols-4 md:grid-rows-2"
      >
        <div
          class="col-span-2 grid grid-rows-subgrid md:col-span-1 md:row-span-2"
        >
          <div class="flex flex-col gap-4 md:contents">
            <div class="flex flex-col gap-3">
              <div
                class="h-10 w-24 animate-pulse rounded-md bg-[#fafafa]"
              ></div>
              <div
                class="h-6 w-3/4 animate-pulse rounded-md bg-[#fafafa]"
              ></div>
            </div>
            <div
              class="h-5 w-32 animate-pulse rounded-md bg-[#fafafa] md:self-end"
            ></div>
          </div>
        </div>

        {#each examplePlaceholderIndexes as exampleIndex (exampleIndex)}
          <div
            class="aspect-square animate-pulse rounded-md bg-[#fafafa]"
          ></div>
        {/each}
      </li>
    {/each}
  </ul>
{:else if examplesState.organizations.length === 0}
  <p class="p-8 text-sm text-gray-500">{m.no_results_found()}</p>
{:else}
  <ul class="flex w-full flex-col gap-8">
    {#each examplesState.visibleHomepageOrganizations as organization (organization.id)}
      <li class="contents">
        <Organization
          {organization}
          count={HOMEPAGE_EXAMPLES_COUNT}
          examples={examplesState.getExamplesByOrganization(organization)}
          loading={examplesState.homepagePending &&
            !examplesState.hasFetchedExamplesByOrganization(organization)}
          failed={examplesState.homepageFailed}
          showMoreLink={true}
        />
      </li>
    {/each}
  </ul>

  {#if examplesState.hasMoreHomepageOrganizations}
    <button
      type="button"
      class="mt-8 rounded-full bg-pink px-4 py-2 font-bold text-white shadow-none transition-all hover:bg-pink/90 hover:shadow-md disabled:cursor-wait disabled:opacity-60"
      disabled={examplesState.homepagePending ||
        examplesState.homepageLoadingMore}
      aria-busy={examplesState.homepageLoadingMore}
      onclick={showMoreOrganizations}
    >
      {examplesState.homepageLoadingMore
        ? m.loading_ellipsis()
        : m.show_more_collections()}
    </button>
  {/if}
{/if}
