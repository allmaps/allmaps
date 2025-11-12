<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import {
    Export as ExportIcon,
    List as ListIcon,
    ArrowUDownLeft as ArrowUDownLeftIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import { isCallbackValid } from '$lib/shared/organizations.js'

  import { Popover } from '@allmaps/components'

  import Export from '$lib/components/popovers/Export.svelte'

  const uiState = getUiState()
  const sourceState = getSourceState()
  const mapsMergedState = getMapsMergedState()
  const urlState = getUrlState()

  let exportDisabled = $derived(
    !sourceState.canEdit || mapsMergedState.completeMaps.length === 0
  )
</script>

<div class="flex flex-row items-center gap-1">
  {#if urlState.params.callback && isCallbackValid(urlState.params.callback)}
    <a
      class="flex flex-row items-center gap-1.5 rounded-full bg-green
          px-3 py-2 font-medium text-white shadow-none transition-all group-disabled:bg-green-300 hover:not-group-disabled:bg-green/90 hover:not-group-disabled:shadow-md"
      href={urlState.params.callback}
    >
      <ArrowUDownLeftIcon
        class="size-5 shrink-0"
        size="100%"
        weight="bold"
      /><span class="hidden sm:inline-block">Done</span>
    </a>{:else}
    <Popover bind:open={uiState.popoverOpen.export} disabled={exportDisabled}>
      {#snippet button()}
        <div
          class="flex flex-row items-center gap-1.5 rounded-full bg-green
          px-3 py-2 font-medium text-white shadow-none transition-all group-disabled:bg-green-300 hover:not-group-disabled:bg-green/90 hover:not-group-disabled:shadow-md"
        >
          <ExportIcon class="size-5 shrink-0" size="100%" weight="bold" /><span
            class="hidden sm:inline-block">Export</span
          >
        </div>
      {/snippet}
      {#snippet contents()}<Export />{/snippet}
    </Popover>
  {/if}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="focus-visible inline-flex aspect-square size-8 cursor-pointer items-center justify-center rounded-full p-1 transition-colors hover:bg-gray-100"
    >
      <ListIcon class="text-foreground size-6" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      class="w-full max-w-[229px] rounded-lg border border-gray-100 bg-white px-1 py-1.5 shadow-md
      data-[state=open]:animate-scale-in"
      sideOffset={8}
    >
      <DropdownMenu.Item
        onclick={() => (uiState.modalOpen.keyboard = true)}
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
      >
        Keyboard shortcuts…
      </DropdownMenu.Item>
      <DropdownMenu.Item
        onclick={() => (uiState.modalOpen.about = true)}
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
      >
        About Allmaps Editor…
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
