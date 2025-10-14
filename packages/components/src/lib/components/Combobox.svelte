<script lang="ts" generics="Item extends ComboboxBaseItem">
  import { scale } from 'svelte/transition'

  import { Combobox } from 'bits-ui'

  import {
    // CaretUpDown as CaretUpDownIcon,
    // Check as CheckIcon,
    CaretDoubleUp as CaretDoubleUpIcon,
    CaretDoubleDown as CaretDoubleDownIcon
  } from 'phosphor-svelte'

  import LoadingSmall from '$lib/components/LoadingSmall.svelte'

  import type { ComboboxBaseItem } from '$lib/shared/types.js'

  import type { Component } from 'svelte'

  type Props = {
    placeholder: string
    items: Item[][]
    value?: string
    loading?: boolean
    onselect?: (item: Item) => void
    oninput?: (value: string) => void
    icon?: Component
    openOnFocus?: boolean
  }

  let {
    placeholder = 'Search…',
    items,
    value = $bindable(),
    loading = $bindable(false),
    onselect,
    oninput,
    icon: Icon,
    openOnFocus = false
  }: Props = $props()

  let selectedItem = $derived.by<Item | undefined>(() => {
    if (value) {
      const item = items
        .flat()
        .find((item) => 'value' in item && item.value === value)

      if (item) {
        return item as Item
      }
    }
  })

  // svelte-ignore state_referenced_locally
  let inputValue = $state(selectedItem?.label || '')

  let open = $state(false)

  let customAnchor = $state.raw<HTMLElement>(null!)

  let groups = $derived(items.filter((group) => group.length > 0))

  $effect(() => {
    if (selectedItem) {
      onselect?.(selectedItem)
    }
  })

  $effect(() => {
    oninput?.(inputValue)
  })

  function handleInputFocus() {
    if (openOnFocus) {
      open = true
    }
  }
</script>

<Combobox.Root type="single" loop bind:value bind:open>
  <div
    bind:this={customAnchor}
    class="cursor-pointer w-full px-1 py-1 rounded-lg bg-white outline-none
    inline-flex items-center justify-between gap-2 text-left
    border-solid border-gray-100 border-1 transition-colors
    focus-within:border-pink inset-shadow-xs"
  >
    <Icon class="size-6" />
    <Combobox.Input
      class="truncate rounded-lg
        placeholder:text-black placeholder:font-normal
        focus:outline-none w-full bg-transparent"
      {placeholder}
      aria-label={placeholder}
      spellcheck="false"
      autocomplete="off"
      type="search"
    >
      {#snippet child({ props })}
        <input {...props} bind:value={inputValue} onfocus={handleInputFocus} />
      {/snippet}
    </Combobox.Input>
  </div>

  <Combobox.Portal>
    <Combobox.Content
      forceMount
      sideOffset={1}
      {customAnchor}
      class="border border-gray-100 bg-white shadow-lg p-1
      outline-hidden z-50 max-h-[var(--bits-combobox-content-available-height)] w-[var(--bits-combobox-anchor-width)]
      min-w-[var(--bits-combobox-anchor-width)] select-none rounded-lg data-[side=bottom]:translate-y-1
      data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div transition:scale={{ start: 0.95, duration: 75 }} {...props}>
              <Combobox.ScrollUpButton
                class="flex w-full items-center justify-center"
              >
                <CaretDoubleUpIcon class="size-3" />
              </Combobox.ScrollUpButton>
              <Combobox.Viewport>
                {#if loading}
                  <div class="p-2 text-sm text-gray flex items-center gap-2">
                    <LoadingSmall />
                    <span class="text-sm text-gray-600">Loading</span>
                  </div>
                {:else}
                  {#each groups as group, index (index)}
                    {@const lastGroup = index === items.length - 1}
                    {#each group as item (item.value)}
                      {@const { value, label, Icon } = item}
                      <Combobox.Item
                        class="flex items-center justify-between h-10 w-full select-none rounded-md p-1 text-sm
            cursor-pointer truncate outline-none data-[highlighted]:bg-gray-100"
                        {value}
                        {label}
                      >
                        <div>
                          {label}
                        </div>
                      </Combobox.Item>

                      <!-- {:else}
                      <span class="flex items-center p-2 text-sm text-gray">
                        {#if inputValue}
                          No results found
                        {:else}
                          Start typing to search locations
                        {/if}
                      </span> -->
                    {/each}
                    {#if groups.length > 1 && !lastGroup}
                      <Combobox.Separator
                        class="my-1 border-t border-gray-200"
                      />
                    {/if}
                  {/each}
                {/if}
              </Combobox.Viewport>
              <Combobox.ScrollDownButton
                class="flex w-full items-center justify-center"
              >
                <CaretDoubleDownIcon class="size-3" />
              </Combobox.ScrollDownButton>
            </div>
          </div>
        {/if}
      {/snippet}
    </Combobox.Content>
  </Combobox.Portal>
</Combobox.Root>
