<script lang="ts">
  import { Select, type WithoutChildren } from 'bits-ui'

  import {
    Check as CheckIcon,
    CaretUpDown as CaretUpDownIcon,
    CaretDoubleUp as CaretDoubleUpIcon,
    CaretDoubleDown as CaretDoubleDownIcon
  } from 'phosphor-svelte'

  type Props = WithoutChildren<Select.RootProps> & {
    placeholder?: string
    items: { value: string; label: string; disabled?: boolean }[]
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

  const selectedLabel = $derived(
    items.find((item) => item.value === value)?.label
  )
</script>

<!--
TypeScript Discriminated Unions + destructing (required for "bindable") do not
get along, so we shut typescript up by casting `value` to `never`, however,
from the perspective of the consumer of this component, it will be typed appropriately.
-->
<Select.Root bind:value={value as never} {type} {onValueChange}>
  <Select.Trigger
    class="cursor-pointer inline-flex w-full items-center justify-between px-2 py-1 rounded-lg bg-white outline-none
    border-solid border-gray-100 border-1 transition-colors
    focus-within:border-pink inset-shadow-xs text-sm sm:text-base"
  >
    {selectedLabel ? selectedLabel : placeholder}
    <CaretUpDownIcon class="size-6" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      class="rounded-lg bg-white p-1 shadow-lg outline-hidden z-50
      w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)]
      "
    >
      <Select.ScrollUpButton class="flex w-full items-center justify-center">
        <CaretDoubleUpIcon class="size-3" />
      </Select.ScrollUpButton>
      <Select.Viewport>
        {#each items as { value, label, disabled } (value)}
          <Select.Item
            {value}
            {label}
            {disabled}
            class="flex h-10 w-full text-sm sm:text-base select-none items-center rounded-sm py-3 pl-5 pr-1.5
        hover:bg-gray-100 cursor-pointer outline-hidden transition-all gap-2 justify-between"
          >
            {#snippet children({ selected }: { selected: boolean })}
              {label}
              {#if selected}
                <div class="ml-auto">
                  <CheckIcon />
                </div>
              {/if}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
      <Select.ScrollDownButton class="flex w-full items-center justify-center">
        <CaretDoubleDownIcon class="size-3" />
      </Select.ScrollDownButton>
    </Select.Content>
  </Select.Portal>
</Select.Root>
