<script lang="ts">
  import { Select } from 'bits-ui'

  import {
    Check as CheckIcon,
    CaretUpDown as CaretUpDownIcon
  } from 'phosphor-svelte'
  import { getMapsState } from '$lib/state/maps.svelte.js'

  import type { DbMap3, DbTransformation } from '$lib/types/maps.js'

  type Props = {
    map: DbMap3
  }

  const mapsState = getMapsState()

  let { map }: Props = $props()

  type Item = {
    value: DbTransformation
    label?: string
    disabled?: boolean
  }

  const transformationTypes: Item[] = [
    { value: 'polynomial1', label: 'Polynomial' },
    { value: 'thinPlateSpline', label: 'Thin plate spline' }
  ]

  function handleSelectedChange(selected: Item | undefined) {
    if (selected) {
      mapsState.setTransformation({
        mapId: map.id,
        transformation: selected.value
      })
    }
  }

  const selected = $derived(
    transformationTypes.find(
      (transformationType) =>
        transformationType.value === mapsState.maps?.[map.id]?.transformation
    )
  )
</script>

<Select.Root
  items={transformationTypes}
  {selected}
  onSelectedChange={handleSelectedChange}
>
  <Select.Trigger
    class="cursor-pointer inline-flex w-full items-center justify-between px-2 py-1 rounded-lg bg-white outline-none
    border-solid border-gray-100 border-1 transition-colors
    focus-within:border-pink inset-shadow-xs"
    aria-label="Select a transformation algorithm"
  >
    <Select.Value class="text-xs sm:text-xs" placeholder="Polynomial" />

    <CaretUpDownIcon class="size-6" />
  </Select.Trigger>
  <Select.Content
    class="w-full rounded-lg bg-white p-1 shadow-lg outline-hidden z-50"
    sideOffset={8}
  >
    {#each transformationTypes as transformationType}
      <Select.Item
        class="flex h-10 w-full text-xs sm:text-xs select-none items-center rounded-sm py-3 pl-5 pr-1.5
        hover:bg-gray-100 cursor-pointer outline-hidden transition-all"
        value={transformationType.value}
        label={transformationType.label}
      >
        {transformationType.label}
        <Select.ItemIndicator class="ml-auto" asChild={false}>
          <CheckIcon />
        </Select.ItemIndicator>
      </Select.Item>
    {/each}
  </Select.Content>
  <Select.Input name="transformationType" />
</Select.Root>
