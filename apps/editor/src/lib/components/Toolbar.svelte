<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import {
    Export as ExportIcon,
    DotsThree as DotsThreeIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import Popover from '$lib/components/Popover.svelte'
  import Export from '$lib/components/popovers/Export.svelte'

  const uiState = getUiState()

  let exportPopoverOpen = $state(false)

  function handleMenuItemClick() {
    uiState.showAboutDialog = true
  }
</script>

<div>
  <Popover bind:open={exportPopoverOpen}>
    {#snippet button()}
      <div
        class="flex flex-row gap-1.5 px-3 py-2 rounded-full
        items-center font-medium text-white
      bg-green/90 hover:bg-green/100 shadow-none hover:shadow-md transition-all
        "
      >
        <ExportIcon class="size-5 shrink-0" size="100%" weight="bold" /><span
          >Export</span
        >
      </div>
    {/snippet}
    {#snippet title()}<div class="flex items-center gap-2">
        <ExportIcon class="size-6" size="100%" /><span>Export options for</span>
      </div>{/snippet}
    {#snippet contents()}<Export />{/snippet}
  </Popover>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="cursor-pointer focus-visible p-1 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
    >
      <DotsThreeIcon class="h-6 w-6 text-foreground" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      class="z-50 w-full max-w-[229px] rounded-xl border border-gray-100 bg-white px-1 py-1.5 shadow-md
      data-[state=open]:animate-scale-in"
      sideOffset={8}
    >
      <DropdownMenu.Item
        onclick={handleMenuItemClick}
        class="flex h-10 select-none cursor-pointer items-center rounded-md py-3 pl-3 pr-1.5 text-sm font-medium ring-0! ring-transparent! data-highlighted:bg-muted hover:bg-gray-100"
      >
        About Allmaps Editor
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
