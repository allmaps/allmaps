<script lang="ts">
  import { scale } from 'svelte/transition'

  import { Select, type WithoutChildren } from 'bits-ui'

  import {
    Check as CheckIcon,
    CaretUpDown as CaretUpDownIcon,
    CaretDoubleUp as CaretDoubleUpIcon,
    CaretDoubleDown as CaretDoubleDownIcon
  } from 'phosphor-svelte'

  import type { Component } from 'svelte'
  import type { IconComponentProps } from 'phosphor-svelte'

  type SelectItem = {
    value: string
    label: string
    Icon?: Component<IconComponentProps>
    disabled?: boolean
  }

  type Props = WithoutChildren<Select.RootProps> & {
    placeholder?: string
    items: SelectItem[]
    type?: 'single' | 'multiple'
    onValueChange?: (value: string | string[]) => void
  }

  let {
    value = $bindable(),
    items,
    placeholder,
    type,
    onValueChange
  }: Props = $props()

  let selectedItem = $derived<SelectItem | undefined>(
    value ? items.find((item) => item.value === value) : undefined
  )

  let Icon = $derived(selectedItem ? selectedItem.Icon : undefined)
</script>

<!--
TypeScript Discriminated Unions + destructing (required for "bindable") do not
get along, so we shut typescript up by casting `value` to `never`, however,
from the perspective of the consumer of this component, it will be typed appropriately.
-->
<Select.Root bind:value={value as never} {type} {onValueChange}>
  <Select.Trigger
    class="cursor-pointer w-full px-1 py-0.5 rounded-lg bg-white outline-none
    inline-flex items-center justify-between gap-2 text-left
    border-solid border-gray-100 border-1 transition-colors
    focus-within:border-pink inset-shadow-xs text-sm sm:text-base"
  >
    <Icon class="size-5 shrink-0" />
    <span class="w-full"
      >{selectedItem?.label ? selectedItem?.label : placeholder}</span
    >
    <CaretUpDownIcon class="size-5 shrink-0" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      forceMount
      sideOffset={4}
      class="rounded-lg bg-white p-1 shadow-lg outline-hidden z-50
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
                    class="w-full text-sm sm:text-base select-none
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
