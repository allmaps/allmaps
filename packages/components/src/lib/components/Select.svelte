<script lang="ts" generics="Item extends SelectBaseItem">
  import { scale } from 'svelte/transition'

  import { Select } from 'bits-ui'

  import {
    Check as CheckIcon,
    CaretUpDown as CaretUpDownIcon,
    CaretDoubleUp as CaretDoubleUpIcon,
    CaretDoubleDown as CaretDoubleDownIcon
  } from 'phosphor-svelte'

  import type { SelectBaseItem } from '$lib/shared/types.js'

  type Props = {
    value?: string
    placeholder?: string
    items: Item[]
    onselect?: (item: Item) => void
    to?: HTMLElement
  }

  let {
    value = $bindable(),
    items,
    placeholder,
    onselect,
    to
  }: Props = $props()

  $effect(() => {
    if (onselect && selectedItem) {
      onselect(selectedItem)
    }
  })

  let selectedItem = $derived.by<Item | undefined>(() => {
    if (value) {
      const item = items.find((item) => item.value === value)

      if (item) {
        return item as Item
      }
    }
  })

  let Icon = $derived(selectedItem ? selectedItem.Icon : undefined)
</script>

<Select.Root bind:value type="single">
  <Select.Trigger
    class="cursor-pointer w-full px-1 py-1 rounded-lg bg-white outline-none
    inline-flex items-center justify-between gap-2 text-left
    border-solid border-gray-100 border-1 transition-colors
    focus-within:border-pink inset-shadow-xs"
  >
    <Icon class="size-5 shrink-0" />
    <span class="w-full"
      >{selectedItem?.label ? selectedItem?.label : placeholder}</span
    >
    <CaretUpDownIcon class="size-5 shrink-0" />
  </Select.Trigger>
  <Select.Portal {to}>
    <Select.Content
      forceMount
      sideOffset={4}
      class="outline-hidden z-50
      bg-white p-1 shadow-lg rounded-md
        border-1 border-gray-200 overflow-auto
        max-h-[calc((var(--bits-popover-content-available-height))-(--spacing(2)))]
        w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)]"
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div transition:scale={{ start: 0.95, duration: 75 }} {...props}>
              <Select.ScrollUpButton
                class="flex w-full items-center justify-center"
              >
                <CaretDoubleUpIcon class="size-3" />
              </Select.ScrollUpButton>
              <Select.Viewport>
                {#each items as { value, label, disabled, Icon } (value)}
                  <Select.Item
                    {value}
                    {label}
                    {disabled}
                    class="w-full select-none
                    inline-flex items-center justify-between gap-2 text-left
                    rounded-sm px-1 py-2
                  hover:bg-gray-100 cursor-pointer outline-hidden transition-all"
                  >
                    {#snippet children({ selected }: { selected: boolean })}
                      <Icon class="size-5 shrink-0" />
                      <span class="w-full">{label}</span>
                      {#if selected}
                        <CheckIcon class="shrink-0 text-pink" weight="bold" />
                      {/if}
                    {/snippet}
                  </Select.Item>
                {/each}
              </Select.Viewport>
              <Select.ScrollDownButton
                class="flex w-full items-center justify-center"
              >
                <CaretDoubleDownIcon class="size-3" />
              </Select.ScrollDownButton>
            </div>
          </div>
        {/if}
      {/snippet}
    </Select.Content>
  </Select.Portal>
</Select.Root>
