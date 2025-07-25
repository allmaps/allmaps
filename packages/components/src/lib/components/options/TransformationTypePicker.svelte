<script lang="ts">
  import { Select } from 'bits-ui'
  import Check from 'phosphor-svelte/lib/Check'
  import CaretUpDown from 'phosphor-svelte/lib/CaretUpDown'
  import CaretDoubleUp from 'phosphor-svelte/lib/CaretDoubleUp'
  import CaretDoubleDown from 'phosphor-svelte/lib/CaretDoubleDown'

  import {
    Straight,
    Helmert,
    Polynomial1,
    Polynomial2,
    Polynomial3,
    ThinPlateSpline,
    Projective
  } from '@allmaps/ui'

  import { supportedtransformationTypes } from '@allmaps/transform'
  import { camelCaseToWords } from '@allmaps/stdlib'

  import type { TransformationType } from '@allmaps/transform'

  export type PickerTransformationType = TransformationType | 'undefined'

  function translateTransformationType(
    transformationType: PickerTransformationType
  ): string {
    if (transformationType == 'undefined') {
      return 'Select...'
    } else {
      return camelCaseToWords(transformationType)
    }
  }

  let {
    selectedTransformationType = $bindable()
  }: {
    selectedTransformationType?: TransformationType | undefined
  } = $props()

  export const transformationTypes = [
    'undefined',
    ...supportedtransformationTypes
  ] as PickerTransformationType[]
  let transformationTypeItems = transformationTypes.map(
    (transformationType) => {
      return {
        label: translateTransformationType(transformationType),
        value: transformationType
      }
    }
  )

  const selectedTransformationTypeItem = $derived.by(() => {
    const item = transformationTypeItems.find(
      (item) => item.value === selectedTransformationType
    )
    return item ? item : transformationTypeItems[0]
  })
</script>

{#snippet item(transformationTypeItem: {
  value: PickerTransformationType
  label: string
})}
  <div class="size-5 mr-2">
    {#if transformationTypeItem.value === 'straight'}
      <Straight />
    {:else if transformationTypeItem.value === 'helmert'}
      <Helmert />
    {:else if transformationTypeItem.value === 'polynomial'}
      <Polynomial1 />
    {:else if transformationTypeItem.value === 'polynomial2'}
      <Polynomial2 />
    {:else if transformationTypeItem.value === 'polynomial3'}
      <Polynomial3 />
    {:else if transformationTypeItem.value === 'thinPlateSpline'}
      <ThinPlateSpline />
    {:else if transformationTypeItem.value === 'projective'}
      <Projective />
    {:else}<Polynomial1 />
    {/if}
  </div>
  {transformationTypeItem.label}
{/snippet}

<Select.Root
  type="single"
  onValueChange={(v) => {
    selectedTransformationType =
      v === 'undefined' ? undefined : (v as TransformationType)
  }}
  items={transformationTypeItems}
>
  <Select.Trigger
    class="
    pl-3 pr-2 h-9  bg-white  border-gray-200 rounded-lg truncate
        focus:z-10 focus:outline-none
        focus:ring-2 w-full
     data-placeholder:text-foreground-alt/50 inline-flex touch-none select-none items-center border px-[11px] text-sm transition-colors"
    aria-label="Select a Transformation Type"
  >
    {@render item(selectedTransformationTypeItem)}
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
        {#each transformationTypeItems as transformationTypeItem, i (i + transformationTypeItem.value)}
          <Select.Item
            class="rounded-button data-highlighted:bg-muted outline-hidden data-disabled:opacity-50 flex h-10 w-full select-none items-center pl-3 pr-2 text-sm capitalize
            rounded px-2 py-2 truncate outline-none data-[highlighted]:bg-gray-100"
            value={transformationTypeItem.value}
            label={transformationTypeItem.label}
          >
            {#snippet children({ selected })}
              {@render item(transformationTypeItem)}
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
