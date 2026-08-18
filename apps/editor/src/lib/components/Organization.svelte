<script lang="ts">
  import { onMount } from 'svelte'

  import { Pagination, type PageItem } from 'bits-ui'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon
  } from 'phosphor-svelte'

  import { getExamplesState } from '$lib/state/examples.svelte.js'
  import { m } from '$lib/paraglide/messages.js'

  import Example from '$lib/components/Example.svelte'

  import type { ApiOrganization } from '$lib/shared/examples.js'
  import type { Example as ExampleType } from '$lib/types/shared.js'

  type Props = {
    count?: number
    perPage?: number
    organization: ApiOrganization
    examples?: ExampleType[]
    fetchExamples?: boolean
    showMoreLink?: boolean
  }

  const DEFAULT_COUNT = 6

  let {
    count = DEFAULT_COUNT,
    perPage = Number.POSITIVE_INFINITY,
    organization,
    examples: initialExamples,
    fetchExamples = initialExamples === undefined,
    showMoreLink = false
  }: Props = $props()

  // svelte-ignore state_referenced_locally
  let examples = $state<ExampleType[]>(initialExamples ?? [])
  // svelte-ignore state_referenced_locally
  let loading = $state(fetchExamples)
  let failed = $state(false)

  const paginationCount = $derived(
    Math.max(examples.length, loading ? count : 1)
  )
  const usePagination = $derived(!loading && examples.length > perPage)
  const placeholderCount = $derived(
    Math.min(count, Number.isFinite(perPage) ? perPage : count)
  )

  const examplesState = getExamplesState()

  onMount(async () => {
    if (!fetchExamples) {
      return
    }

    try {
      examples = await examplesState.getExamplesByOrganization(
        organization,
        count
      )
    } catch (error) {
      failed = true
      console.error('Failed to fetch examples for organization', error)
    } finally {
      loading = false
    }
  })
</script>

{#snippet header(organization: ApiOrganization)}
  <div class="contents flex-col gap-2 sm:gap-4 md:flex">
    <svelte:element
      this={showMoreLink ? 'a' : 'div'}
      class="flex flex-col items-start gap-2"
      href={showMoreLink ? `/organizations/${organization.slug}` : undefined}
    >
      {#if organization.logo}
        <img
          class="inline-block h-16 max-w-40 object-contain"
          src={organization.logo}
          alt={organization.name}
        />
      {/if}
      <h3 class="text-xl font-bold text-black">{organization.name}</h3>
    </svelte:element>
  </div>
{/snippet}

<Pagination.Root
  count={paginationCount}
  perPage={Math.min(paginationCount, perPage)}
>
  {#snippet children({
    pages,
    range
  }: {
    pages: PageItem[]
    range: {
      start: number
      end: number
    }
  })}
    {@const page = examples.slice(range.start - 1, range.end)}
    <div
      class="grid auto-rows-auto grid-cols-2 gap-8 rounded-2xl bg-white p-4 shadow-md md:grid-cols-4 md:grid-rows-2"
    >
      {#if showMoreLink}
        <div
          class="col-span-2 grid grid-rows-subgrid md:col-span-1 md:row-span-2"
        >
          <div class="flex flex-col gap-2 md:contents">
            {@render header(organization)}
            <div class="md:self-end">
              <a
                href={`/organizations/${organization.slug}`}
                class="font-bold text-pink after:content-['_›'] hover:underline"
                >{m.more_from_this_collection()}
              </a>
            </div>
          </div>
        </div>
      {:else}
        {@render header(organization)}
      {/if}
      <ul class="contents">
        {#if loading}
          {#each Array(placeholderCount).keys() as index (index)}
            <li
              class="flex aspect-square animate-pulse items-center justify-center space-y-2 rounded-md bg-[#fafafa] text-xs text-gray-500"
            >
              <p>{m.loading_ellipsis()}</p>
            </li>
          {/each}
        {:else if failed || page.length === 0}
          <li
            class="col-span-2 flex min-h-40 items-center justify-center rounded-md bg-[#fafafa] p-4 text-center text-xs text-gray-500 md:col-span-3"
          >
            <p>{m.no_results_found()}</p>
          </li>
        {:else}
          {#each page as example (example.imageId)}
            <Example {example} />
          {/each}
        {/if}
      </ul>
    </div>

    {#if usePagination}
      <div class="my-8 flex items-center justify-center text-xs">
        <Pagination.PrevButton
          class="disabled:text-muted-foreground mr-6 inline-flex size-10 items-center justify-center rounded-lg bg-transparent hover:bg-blue-200 disabled:cursor-not-allowed hover:disabled:bg-transparent"
        >
          <CaretLeftIcon class="size-6" />
        </Pagination.PrevButton>
        <div class="flex items-center gap-2.5">
          {#each pages as page (page.key)}
            {#if page.type === 'ellipsis'}
              <div class="text-foreground-alt font-medium">...</div>
            {:else}
              <Pagination.Page
                {page}
                class="inline-flex size-10 items-center justify-center rounded-lg bg-transparent font-medium hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50 hover:disabled:bg-transparent data-selected:bg-blue-200"
              >
                {page.value}
              </Pagination.Page>
            {/if}
          {/each}
        </div>
        <Pagination.NextButton
          class="disabled:text-muted-foreground ml-6 inline-flex size-10 items-center justify-center rounded-lg bg-transparent hover:bg-blue-200 disabled:cursor-not-allowed hover:disabled:bg-transparent"
        >
          <CaretRightIcon class="size-6" />
        </Pagination.NextButton>
      </div>
    {/if}
  {/snippet}
</Pagination.Root>
