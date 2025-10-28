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
</script>

<Pagination.Root bind:page {count} {perPage} {onPageChange}>
  {#snippet children({ pages, range })}
    <div class="my-8 flex items-center">
      <Pagination.PrevButton
        class="hover:bg-dark-10 disabled:text-muted-foreground mr-[25px] inline-flex size-10 cursor-pointer
        items-center justify-center rounded-[9px] bg-transparent active:scale-[0.98]
        disabled:cursor-not-allowed hover:disabled:bg-transparent"
      >
        <CaretLeftIcon class="size-6" />
      </Pagination.PrevButton>
      <div class="flex items-center gap-2.5">
        {#each pages as page (page.key)}
          {#if page.type === 'ellipsis'}
            <div
              class="text-foreground-alt select-none text-[15px] font-medium"
            >
              ...
            </div>
          {:else}
            <Pagination.Page
              {page}
              class="hover:bg-dark-10 data-selected:bg-foreground data-selected:text-background
               inline-flex size-10 cursor-pointer select-none items-center justify-center rounded-[9px]
               bg-transparent text-[15px] font-medium active:scale-[0.98] disabled:cursor-not-allowed
               disabled:opacity-50  hover:disabled:bg-transparent"
            >
              {page.value}
            </Pagination.Page>
          {/if}
        {/each}
      </div>
      <Pagination.NextButton
        class="hover:bg-dark-10 disabled:text-muted-foreground ml-[29px] inline-flex size-10 cursor-pointer
        items-center justify-center rounded-[9px] bg-transparent active:scale-[0.98]
        disabled:cursor-not-allowed hover:disabled:bg-transparent"
      >
        <CaretRightIcon class="size-6" />
      </Pagination.NextButton>
    </div>
    <p class="text-muted-foreground text-center text-[13px]">
      Showing {range.start} - {range.end}
    </p>
  {/snippet}
</Pagination.Root>
