<script lang="ts">
  import { Select } from 'bits-ui'
  import Check from 'phosphor-svelte/lib/Check'
  import CaretUpDown from 'phosphor-svelte/lib/CaretUpDown'
  import CaretDoubleUp from 'phosphor-svelte/lib/CaretDoubleUp'
  import CaretDoubleDown from 'phosphor-svelte/lib/CaretDoubleDown'
  import Angle from 'phosphor-svelte/lib/Angle'
  import Empty from 'phosphor-svelte/lib/Empty'
  import Resize from 'phosphor-svelte/lib/Resize'

  import type { DistortionMeasure } from '@allmaps/transform'

  export type PickerDistortionMeasure = DistortionMeasure | 'none'

  let {
    selectedDistortionMeasure = $bindable()
  }: {
    selectedDistortionMeasure?: DistortionMeasure | undefined
  } = $props()

  function translateDistortionMeasure(
    distortionMeasure: PickerDistortionMeasure
  ): string {
    if (distortionMeasure == 'none') {
      return 'None'
    }
    if (distortionMeasure == 'log2sigma') {
      return 'Area distortion'
    }
    if (distortionMeasure == 'twoOmega') {
      return 'Angular distortion'
    }
    return ''
  }

  export const distortionMeasures = [
    'none',
    'log2sigma',
    'twoOmega'
  ] as PickerDistortionMeasure[]
  let distortionMeasureItems = distortionMeasures.map((distortionMeasure) => {
    return {
      label: translateDistortionMeasure(distortionMeasure),
      value: distortionMeasure
    }
  })

  const selectedDistortionMeasureItem = $derived.by(() => {
    const item = distortionMeasureItems.find(
      (item) => item.value === selectedDistortionMeasure
    )
    return item ? item : distortionMeasureItems[0]
  })
</script>

{#snippet item(distortionMeasureItem: {
  value: PickerDistortionMeasure
  label: string
})}
  <div class="size-5 mr-2">
    {#if distortionMeasureItem.value === 'log2sigma'}
      <Resize weight="thin" class="size-5" />
    {:else if distortionMeasureItem.value === 'twoOmega'}
      <Angle weight="thin" class="size-5" />
    {/if}
  </div>
  {distortionMeasureItem.label}
{/snippet}

<Select.Root
  type="single"
  onValueChange={(v) => {
    selectedDistortionMeasure =
      v === 'none' ? undefined : (v as DistortionMeasure)
  }}
  items={distortionMeasureItems}
>
  <Select.Trigger
    class="
    pl-3 pr-2 h-9  bg-white  border-gray-200 rounded-lg truncate
        focus:z-10 focus:outline-none
        focus:ring-2 w-full
     data-placeholder:text-foreground-alt/50 inline-flex touch-none select-none items-center border px-[11px] text-sm transition-colors"
    aria-label="Select a Distortion Measure"
  >
    {@render item(selectedDistortionMeasureItem)}
    <CaretUpDown class="text-muted-foreground ml-auto size-6" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      class="
      border-gray-200 bg-white shadow-md outline-none
      focus-override border-muted shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-hidden z-50 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] select-none rounded-xl border px-1 py-1 data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
      sideOffset={10}
    >
      <Select.ScrollUpButton class="flex w-full items-center justify-center">
        <CaretDoubleUp class="size-3" />
      </Select.ScrollUpButton>
      <Select.Viewport class="p-1">
        {#each distortionMeasureItems as distortionMeasureItem, i (i + distortionMeasureItem.value)}
          <Select.Item
            class="rounded-button data-highlighted:bg-muted outline-hidden data-disabled:opacity-50 flex h-10 w-full select-none items-center pl-3 pr-2 text-sm capitalize
            rounded px-2 py-2 truncate outline-none data-[highlighted]:bg-gray-100"
            value={distortionMeasureItem.value}
            label={distortionMeasureItem.label}
          >
            {#snippet children({ selected })}
              {@render item(distortionMeasureItem)}
              {#if selected}
                <div class="ml-auto">
                  <Check aria-label="check" />
                </div>
              {/if}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
      <Select.ScrollDownButton class="flex w-full items-center justify-center">
        <CaretDoubleDown class="size-3" />
      </Select.ScrollDownButton>
    </Select.Content>
  </Select.Portal>
</Select.Root>
