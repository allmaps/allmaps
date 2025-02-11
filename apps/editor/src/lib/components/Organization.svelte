<script lang="ts">
  import { onMount } from 'svelte'

  import { Pagination } from 'bits-ui'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon
  } from 'phosphor-svelte'

  import { getExamplesState } from '$lib/state/examples.svelte.js'

  import Example from '$lib/components/Example.svelte'

  import type {
    Organization,
    Example as ExampleType
  } from '$lib/types/shared.js'

  type Props = {
    count?: number
    perPage?: number
    organization: Organization
    showMoreLink?: boolean
  }

  const DEFAULT_COUNT = 6

  let examples: ExampleType[] = $state([])

  let {
    count = DEFAULT_COUNT,
    perPage = Number.POSITIVE_INFINITY,
    organization,
    showMoreLink: showMoreLink = false
  }: Props = $props()

  const usePagination = $derived(count > perPage)

  const examplesState = getExamplesState()

  onMount(async () => {
    examples = await examplesState.getExamplesByOrganization(
      organization.id,
      count
    )
  })
</script>

{#snippet header(organization: Organization)}
  <div class="contents md:flex flex-col gap-2 sm:gap-4">
    <svelte:element
      this={showMoreLink ? 'a' : 'div'}
      href={showMoreLink ? `/organizations/${organization.id}` : undefined}
    >
      {#await import(`$lib/images/organizations/${organization.id}.svg`) then { default: src }}
        <img
          class="inline-block size-16 object-contain"
          {src}
          alt={organization.title}
        />
      {/await}
      <h3 class="text-black font-bold text-xl">{organization.title}</h3>
      <!-- <h4 class="text-black">{organization.subtitle}</h4> -->
    </svelte:element>
  </div>
{/snippet}

<Pagination.Root {count} perPage={Math.min(count, perPage)} let:pages let:range>
  {@const page = examples.slice(range.start, range.end)}
  <div
    class="grid grid-cols-2 md:grid-cols-4 auto-rows-auto md:grid-rows-2 gap-8 bg-white rounded-2xl shadow-md p-4"
  >
    {#if showMoreLink}
      <div
        class="col-span-2 md:col-span-1 md:row-span-2 grid grid-rows-subgrid"
      >
        <div class="flex flex-col gap-2 md:contents">
          {@render header(organization)}
          <div class="md:self-end">
            <a
              href="/organizations/{organization.id}"
              class="font-bold text-pink hover:underline after:content-['_›']"
              >More from this collection
            </a>
          </div>
        </div>
      </div>
    {:else}
      {@render header(organization)}
    {/if}
    <ul class="contents">
      {#each page as example (example.imageId)}
        <Example {example} />
      {/each}
    </ul>
  </div>

  {#if usePagination}
    <div class="my-8 flex items-center justify-center text-xs">
      <Pagination.PrevButton
        class="mr-6 inline-flex size-10 items-center justify-center rounded-lg bg-transparent hover:bg-blue-200 disabled:cursor-not-allowed disabled:text-muted-foreground hover:disabled:bg-transparent"
      >
        <CaretLeftIcon class="size-6" />
      </Pagination.PrevButton>
      <div class="flex items-center gap-2.5">
        {#each pages as page (page.key)}
          {#if page.type === 'ellipsis'}
            <div class="font-medium text-foreground-alt">...</div>
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
        class="ml-6 inline-flex size-10 items-center justify-center rounded-lg bg-transparent hover:bg-blue-200 disabled:cursor-not-allowed disabled:text-muted-foreground hover:disabled:bg-transparent"
      >
        <CaretRightIcon class="size-6" />
      </Pagination.NextButton>
    </div>
  {/if}
</Pagination.Root>
