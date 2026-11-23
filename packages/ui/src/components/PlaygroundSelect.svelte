<script lang="ts">
  import * as Select from '$lib/select.js'
  let {
    label,
    options,
    value = $bindable(''),
    labels = {},
    swatches,
    compact = false,
    disabled = false,
    size = 'default'
  }: {
    label: string
    options: readonly string[]
    value?: string
    labels?: Record<string, string>
    compact?: boolean
    swatches?: Record<string, string>
    disabled?: boolean
    size?: 'sm' | 'default'
  } = $props()
  const id = $props.id()
</script>

{#snippet optionLabel(option: string, swatchOnly = false)}
  <span class="inline-flex items-center gap-2">
    {#if swatches}
      <span
        aria-hidden="true"
        class="size-4 shrink-0 rounded-sm border border-input"
        style:background-color={swatches[option]}
      ></span>
    {/if}
    <span class:sr-only={swatchOnly}>{labels[option] ?? option}</span>
  </span>
{/snippet}

<div class="grid gap-1.5 text-sm">
  <label for={id} class:sr-only={compact}>{label}</label>
  <Select.Root type="single" bind:value {disabled}>
    <Select.Trigger
      {id}
      {size}
      title={compact ? label + ' — ' + (labels[value] ?? value) : undefined}
      class={compact ? 'gap-1! px-2!' : undefined}
      >{@render optionLabel(value, compact)}</Select.Trigger
    >
    <Select.Content>
      {#each options as option (option)}
        <Select.Item value={option} label={labels[option] ?? option}
          >{@render optionLabel(option)}</Select.Item
        >
      {/each}
    </Select.Content>
  </Select.Root>
</div>
