<script lang="ts">
  import { SlidersHorizontal } from 'phosphor-svelte'
  import { Popover } from 'bits-ui'

  import Options from './Options.svelte'

  import type { Bbox } from '@allmaps/types'

  import type { LayerOptionsState } from './OptionsState.svelte'
  import type { PickerProjection } from '$lib/shared/projections/projections'

  let {
    optionsState = $bindable(),
    projections,
    searchProjections,
    geoBbox = undefined,
    suggestProjections = undefined
  }: {
    optionsState: LayerOptionsState
    projections: PickerProjection[]
    searchProjections?: (s: string) => PickerProjection[]
    geoBbox?: Bbox
    suggestProjections?: (b: Bbox) => PickerProjection[]
  } = $props()
</script>

<Popover.Root>
  <Popover.Trigger
    class="
    inline-flex items-center justify-center whitespace-nowrap
    px-2 py-2
    bg-white
    border border-gray-200 rounded-lg
    hover:bg-gray-100 hover:cursor-pointer"
  >
    <SlidersHorizontal weight="bold" />
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      class="
      w-120 rounded-lg  p-4
      bg-white
      border border-gray-200
      data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
      shadow-md
      origin-(--bits-popover-content-transform-origin) z-30"
      sideOffset={8}
      collisionPadding={8}
    >
      <Options
        bind:optionsState
        {projections}
        {searchProjections}
        {geoBbox}
        {suggestProjections}
      />
      <Popover.Arrow class="**:fill-white" />
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
