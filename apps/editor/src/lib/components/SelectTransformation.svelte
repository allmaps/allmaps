<script lang="ts">
  import { Select } from 'bits-ui'

  import { Check as CheckIcon } from 'phosphor-svelte'

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
    class="inline-flex w-full items-center rounded-sm border border-border-input
      bg-white text-sm transition-colors placeholder:text-foreground-alt/50
      focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
    aria-label="Select a transformation algorithm"
  >
    <Select.Value class="text-sm" placeholder="Polynomial" />
  </Select.Trigger>
  <Select.Content
    class="w-full rounded-xl border border-muted bg-white px-1 py-3 shadow-popover outline-none z-50"
    sideOffset={8}
  >
    {#each transformationTypes as transformationType}
      <Select.Item
        class="flex h-10 w-full select-none items-center rounded-button py-3 pl-5 pr-1.5 text-sm
          outline-none transition-all duration-75 data-[highlighted]:bg-muted"
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
