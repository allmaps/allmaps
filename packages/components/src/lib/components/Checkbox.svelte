<script lang="ts">
  import { Checkbox, Label } from 'bits-ui'

  import { Check as CheckIcon } from 'phosphor-svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    checked?: boolean
    disabled?: boolean
    children: Snippet
  }

  const uid = $props.id()

  let {
    checked = $bindable(false),
    disabled = false,
    children
  }: Props = $props()
</script>

<div class="flex items-center gap-2">
  <Checkbox.Root
    id={uid}
    bind:checked
    {disabled}
    aria-labelledby="{uid}-label"
    class="border-gray peer group cursor-pointer
      border-1 inset-shadow-xs
      hover:not-disabled:bg-gray-50
      disabled:cursor-not-allowed disabled:opacity-60
      inline-flex size-6 items-center justify-center rounded-md
      transition-all"
  >
    {#snippet children({ checked })}
      <div
        class="text-pink group-disabled:text-gray inline-flex items-center justify-center"
      >
        {#if checked}
          <CheckIcon class="size-4" weight="bold" />
        {/if}
      </div>
    {/snippet}
  </Checkbox.Root>
  <Label.Root
    id="{uid}-label"
    for={uid}
    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
  >
    {@render children()}
  </Label.Root>
</div>
