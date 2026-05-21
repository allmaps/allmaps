<script lang="ts" generics="T extends string">
  import { Select } from 'bits-ui'

  type Item = { value: T; label: string }

  let {
    value = $bindable(),
    items,
    placeholder = 'Select…',
    disabled = false,
    id,
    onchange,
    class: className = 'w-full'
  }: {
    value: T
    items: Item[]
    placeholder?: string
    disabled?: boolean
    id?: string
    onchange?: (value: T) => void
    class?: string
  } = $props()

  let selectedLabel = $derived(
    items.find((i) => i.value === value)?.label ?? placeholder
  )
</script>

<Select.Root
  type="single"
  bind:value
  onValueChange={(v) => onchange?.(v as T)}
  {disabled}
>
  <Select.Trigger
    {id}
    class="{className} flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
  >
    <span>{selectedLabel}</span>
    <span class="text-gray-400 text-xs">▾</span>
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      class="z-50 w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] rounded-xl border border-gray-200 bg-white shadow-lg py-1 outline-none"
      sideOffset={4}
    >
      <Select.Viewport>
        {#each items as item (item.value)}
          <Select.Item
            value={item.value}
            label={item.label}
            class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer select-none outline-none hover:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-medium"
          >
            {item.label}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
