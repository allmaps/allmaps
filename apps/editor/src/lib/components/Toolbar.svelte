<script lang="ts">
  import { onMount } from 'svelte'
  import { DropdownMenu } from 'bits-ui'

  import {
    Export as ExportIcon,
    List as ListIcon,
    ArrowUDownLeft as ArrowUDownLeftIcon,
    Command as CommandIcon,
    Play as PlayIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { getExamplesState } from '$lib/state/examples.svelte.js'
  import { m } from '$lib/paraglide/messages.js'

  import { Logo, Popover } from '@allmaps/ui'

  import Export from '$lib/components/popovers/Export.svelte'
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte'

  const uiState = getUiState()
  const sourceState = getSourceState()
  const mapsMergedState = getMapsMergedState()
  const urlState = getUrlState()
  const examplesState = getExamplesState()

  let exportDisabled = $derived(
    !sourceState.canEdit || mapsMergedState.completeMaps.length === 0
  )
  let callbackValid = $derived(
    urlState.params.callback
      ? examplesState.isCallbackValid(urlState.params.callback)
      : false
  )

  onMount(() => {
    void examplesState.getOrganizations()
  })
</script>

<div class="flex flex-row items-center gap-1">
  {#if urlState.params.callback && callbackValid}
    <a
      data-tour="editor-export"
      class="flex flex-row items-center gap-1.5 rounded-full bg-green
          px-3 py-2 font-medium text-white shadow-none transition-all group-disabled:bg-green-300 hover:not-group-disabled:bg-green/90 hover:not-group-disabled:shadow-md"
      href={urlState.params.callback}
    >
      <ArrowUDownLeftIcon
        class="size-5 shrink-0"
        size="100%"
        weight="bold"
      /><span class="hidden sm:inline-block">{m.done()}</span>
    </a>{:else}
    <Popover bind:open={uiState.popoverOpen.export} disabled={exportDisabled}>
      {#snippet button()}
        <div
          data-tour="editor-export"
          class="flex flex-row items-center gap-1.5 rounded-full bg-green
          px-3 py-2 font-medium text-white shadow-none transition-all group-disabled:bg-green-300 hover:not-group-disabled:bg-green/90 hover:not-group-disabled:shadow-md"
        >
          <ExportIcon class="size-5 shrink-0" size="100%" weight="bold" /><span
            class="hidden sm:inline-block">{m.export()}</span
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
        onclick={() => uiState.dispatchStartTour()}
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
      >
        <PlayIcon class="size-4 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{m.tour_start_ellipsis()}</span>
      </DropdownMenu.Item>
      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />
      <DropdownMenu.Item
        onclick={() => (uiState.modalOpen.keyboard = true)}
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
      >
        <CommandIcon class="size-4 shrink-0" />
        <span class="min-w-0 flex-1 truncate">
          {m.keyboard_shortcuts_ellipsis()}
        </span>
      </DropdownMenu.Item>
      <LanguageSwitcher />
      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />
      <DropdownMenu.Item
        onclick={() => (uiState.modalOpen.about = true)}
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
      >
        <span class="size-4 shrink-0 [&_svg]:size-full"><Logo /></span>
        <span class="min-w-0 flex-1 truncate">{m.about_editor_ellipsis()}</span>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
