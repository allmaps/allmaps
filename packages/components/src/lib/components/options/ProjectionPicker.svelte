<script lang="ts">
  import { Combobox } from 'bits-ui'
  import CaretUpDown from 'phosphor-svelte/lib/CaretUpDown'
  import Check from 'phosphor-svelte/lib/Check'
  import Globe from 'phosphor-svelte/lib/globe'
  import CaretDoubleUp from 'phosphor-svelte/lib/CaretDoubleUp'
  import CaretDoubleDown from 'phosphor-svelte/lib/CaretDoubleDown'
  import { fly } from 'svelte/transition'

  import type { PickerProjection } from '$lib/shared/projections/projections.js'
  import type { Bbox } from '@allmaps/types'

  function defaultSearchProjections(s: string) {
    return projections.filter((projection) => {
      const lowerCaseSearchValue = s.toLowerCase()
      return (
        projection.name?.toLowerCase().includes(lowerCaseSearchValue) ||
        projection.code?.includes(lowerCaseSearchValue)
      )
    })
  }

  let {
    projections,
    selectedProjection = $bindable(),
    searchProjections = defaultSearchProjections,
    geoBbox = undefined,
    suggestProjections = undefined
  }: {
    projections: PickerProjection[]
    selectedProjection?: PickerProjection | undefined
    searchProjections?: (s: string) => PickerProjection[]
    geoBbox?: Bbox
    suggestProjections?: (b: Bbox) => PickerProjection[]
  } = $props()

  let searchValue = $state('')

  const undefinedProjection: PickerProjection = {
    code: 'undefined',
    name: '',
    comment: 'Default',
    definition: 'undefined'
  }
  const defaultProjection = $derived.by(() => {
    const result = projections.find((projection) => projection.code === '3857')
    if (result) {
      result.comment = 'Common'
    }
    return result
  })
  const suggestedProjections = $derived<PickerProjection[]>(
    geoBbox && suggestProjections
      ? suggestProjections(geoBbox).map((projection) => {
          projection.comment = 'From bbox'
          return projection
        })
      : []
  )
  const topProjections = $derived(
    [
      selectedProjection,
      undefinedProjection,
      defaultProjection,
      ...suggestedProjections
    ]
      .filter((projection) => projection !== undefined)
      .filter(
        (projection, index, self) =>
          self.findIndex((p) => projection.code === p.code) === index
      )
  )
  const topProjectionCodes = $derived(
    topProjections.map((projection) => projection.code)
  )

  const filteredProjections = $derived(
    (searchValue === '' ? projections : searchProjections(searchValue))
      .slice(0, 100)
      .filter((projection) => {
        return !topProjectionCodes.includes(projection.code)
      })
  )
</script>

{#snippet comboBoxItem({ projection }: { projection: PickerProjection })}
  <Combobox.Item
    class="flex items-center justify-between h-10 w-full select-none rounded px-2 py-2 text-sm capitalize truncate outline-none data-[highlighted]:bg-gray-100"
    value={(projection.definition +
      (projection.code ? '|' + projection.code : '')) as string}
    label={projection.name}
  >
    {#snippet children({ selected }: { selected: boolean })}
      <div class="flex justify-between">
        {projection.name}
        {#if projection.comment}
          <div
            class="ml-2 text-xs text-white uppercase bg-gray-300 px-2 py-0.5 rounded-lg"
          >
            {projection.comment}
          </div>
        {/if}
      </div>
      {#if selected}
        <div class="ml-auto">
          <Check />
        </div>
      {/if}
    {/snippet}
  </Combobox.Item>
{/snippet}

<Combobox.Root
  type="single"
  name="projectionPicker"
  onOpenChange={(o) => {
    if (!o) {
      searchValue = ''
    }
  }}
  onValueChange={(v) => {
    if (v === defaultProjection?.code) {
      selectedProjection = undefined
    } else {
      selectedProjection = projections.find(
        (projection) => projection.code === v
      )
    }
    selectedProjection =
      v === 'undefined'
        ? undefined
        : projections.find(
            (projection) => projection.definition === v.split('|')[0]
          )
  }}
>
  <div class="relative">
    <Globe
      weight="thin"
      class="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
    />
    <Combobox.Input
      oninput={(e) => (searchValue = e.currentTarget.value)}
      clearOnDeselect
      class="pl-10 pr-9 h-9 text-sm bg-white border border-gray-200 rounded-lg truncate
        focus:z-10 focus:outline-none
         w-full"
      placeholder={selectedProjection
        ? selectedProjection.name
        : 'Search Projection...'}
      aria-label="Search an EPSG projection"
    />
    <Combobox.Trigger class="absolute end-3 top-1/2 size-6 -translate-y-1/2">
      <CaretUpDown class="text-muted-foreground ml-auto size-6" />
    </Combobox.Trigger>
  </div>
  <Combobox.Portal>
    <Combobox.Content
      class="w-100 rounded-xl border border-gray-200 bg-white px-1 py-2 shadow-md  outline-none z-30"
      sideOffset={10}
      forceMount
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div {...props} transition:fly={{ duration: 300 }}>
              <Combobox.ScrollUpButton
                class="flex w-full items-center justify-center"
              >
                <CaretDoubleUp class="size-3" />
              </Combobox.ScrollUpButton>
              <Combobox.Viewport class="p-1 max-h-90">
                {#if topProjections.length > 0}
                  {#each topProjections as projection, i (i + (projection.definition as string))}
                    {@render comboBoxItem({ projection })}
                  {/each}
                  <Combobox.Separator
                    class="my-1 -ml-1 -mr-1 block h-px bg-gray-200"
                  ></Combobox.Separator>
                {/if}
                {#each filteredProjections as projection, i (i + (projection.definition as string))}
                  {@render comboBoxItem({ projection })}
                {:else}
                  <span
                    class="flex items-center h-10 px-2 py-2 text-sm text-muted-foreground text-gray"
                  >
                    No results found, try again.
                  </span>
                {/each}
              </Combobox.Viewport>
              <Combobox.ScrollDownButton
                class="flex w-full items-center justify-center"
              >
                <CaretDoubleDown class="size-3" />
              </Combobox.ScrollDownButton>
            </div>
          </div>
        {/if}
      {/snippet}
    </Combobox.Content>
  </Combobox.Portal>
</Combobox.Root>
