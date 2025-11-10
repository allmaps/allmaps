<script lang="ts">
  import { Pagination } from 'bits-ui'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon
  } from 'phosphor-svelte'

  type Props = {
    page?: number
    count: number
    perPage?: number
    onPageChange?: (page: number) => void
  }

  let {
    page = $bindable(1),
    count,
    perPage = 25,
    onPageChange
  }: Props = $props()

  function handlePageChange(newPage: number) {
    if (onPageChange) {
      // The Bits UI Pagination component is 1-based, so we subtract 1
      onPageChange(newPage - 1)
    }
  }
</script>

<!-- The Bits UI Pagination component is 1-based, so we subtract 1 -->
<Pagination.Root
  bind:page={() => page + 1, (newPage) => (page = newPage - 1)}
  {count}
  {perPage}
  onPageChange={handlePageChange}
>
  {#snippet children({ pages })}
    <div class="my-8 flex items-center">
      <Pagination.PrevButton
        class="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl
        transition-colors not-disabled:hover:bg-current/10
        disabled:cursor-not-allowed hover:disabled:bg-transparent"
      >
        <CaretLeftIcon class="size-6" />
      </Pagination.PrevButton>
      <div class="flex items-center gap-2">
        {#each pages as page (page.key)}
          {#if page.type === 'ellipsis'}
            <div class="text-[15px] font-medium select-none">…</div>
          {:else}
            <Pagination.Page
              {page}
              class="inline-flex size-10 cursor-pointer
                items-center justify-center rounded-xl transition-colors select-none not-disabled:hover:bg-current/10
                disabled:cursor-not-allowed disabled:opacity-50
                hover:disabled:bg-transparent data-selected:bg-current/10"
            >
              {page.value}
            </Pagination.Page>
          {/if}
        {/each}
      </div>
      <Pagination.NextButton
        class="inline-flex size-10 cursor-pointer items-center justify-center
        rounded-xl transition-colors not-disabled:hover:bg-current/10
        disabled:cursor-not-allowed hover:disabled:bg-transparent"
      >
        <CaretRightIcon class="size-6" />
      </Pagination.NextButton>
    </div>
  {/snippet}
</Pagination.Root>
