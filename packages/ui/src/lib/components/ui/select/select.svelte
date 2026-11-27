<script lang="ts">
  import { Select } from '@ui-sdk/svelte/select'
  import type { ComponentProps } from 'svelte'

  type Props = Omit<
    ComponentProps<typeof Select<string>>,
    'value' | 'onValueChange' | 'multiple' | 'defaultValue'
  > &
    (
      | {
          type: 'single'
          value?: string
          onValueChange?: (value: string) => void
        }
      | {
          type: 'multiple'
          value?: string[]
          onValueChange?: (value: string[]) => void
        }
    )

  let {
    value = $bindable(),
    open = $bindable(false),
    ...options
  }: Props = $props()
  const { type, onValueChange, loop = false, ...rest } = $derived(options)

  function selectOne(next: string | null) {
    if (type !== 'single') return
    value = next ?? ''
    onValueChange?.(value)
  }

  function selectMany(next: string[]) {
    if (type !== 'multiple') return
    value = next
    onValueChange?.(next)
  }
</script>

{#if type === 'multiple'}
  <Select
    {...rest}
    multiple
    {loop}
    bind:open
    bind:value={() => (Array.isArray(value) ? value : []), selectMany}
  />
{:else}
  <Select
    {...rest}
    {loop}
    bind:open
    bind:value={() => (typeof value === 'string' ? value : null), selectOne}
  />
{/if}
