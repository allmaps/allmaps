<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import { Export as ExportIcon, List as ListIcon } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import { Popover } from '@allmaps/components'

  import Export from '$lib/components/popovers/Export.svelte'

  const uiState = getUiState()
</script>

<div class="flex flex-row gap-1 items-center">
  <Popover
    bind:open={
      () => uiState.getPopoverOpen('export'),
      (open) => uiState.setPopoverOpen('export', open)
    }
  >
    {#snippet button()}
      <div
        class="flex flex-row gap-1.5 px-3 py-2 rounded-full
          items-center font-medium text-white
          bg-green/100 hover:bg-green/90 shadow-none hover:shadow-md transition-all"
      >
        <ExportIcon class="size-5 shrink-0" size="100%" weight="bold" /><span
          class="hidden sm:inline-block">Export</span
        >
      </div>
    {/snippet}
    {#snippet contents()}<Export />{/snippet}
  </Popover>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="size-8 cursor-pointer focus-visible aspect-square p-1 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
    >
      <ListIcon class="size-6 text-foreground" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      class="w-full max-w-[229px] rounded-lg border border-gray-100 bg-white px-1 py-1.5 shadow-md
      data-[state=open]:animate-scale-in"
      sideOffset={8}
    >
      <DropdownMenu.Item
        onclick={() => uiState.setModalOpen('keyboard', true)}
        class="flex h-10 select-none cursor-pointer items-center rounded-md py-3 pl-3 pr-1.5 text-sm font-medium ring-0! ring-transparent! data-highlighted:bg-muted hover:bg-gray-100"
      >
        Keyboard shortcuts…
      </DropdownMenu.Item>
      <DropdownMenu.Item
        onclick={() => uiState.setModalOpen('about', true)}
        class="flex h-10 select-none cursor-pointer items-center rounded-md py-3 pl-3 pr-1.5 text-sm font-medium ring-0! ring-transparent! data-highlighted:bg-muted hover:bg-gray-100"
      >
        About Allmaps Editor…
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
