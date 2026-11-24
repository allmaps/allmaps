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
    align = 'start'
  }: {
    label: string
    options: readonly string[]
    value?: string
    labels?: Record<string, string>
    compact?: boolean
    swatches?: Record<string, string>
    disabled?: boolean
    align?: 'start' | 'center' | 'end'
  } = $props()
  const id = $props.id()
</script>

{#snippet optionLabel(option: string, swatchOnly = false)}
  <span class="inline-flex items-center gap-2">
    {#if swatches}
      <span
        aria-hidden="true"
        class="size-4 shrink-0 rounded-sm border border-input"
        style:background-color={swatchOnly
          ? `var(--playground-background, ${swatches[option]})`
          : swatches[option]}
      ></span>
    {/if}
    <span class:sr-only={swatchOnly}>{labels[option] ?? option}</span>
  </span>
{/snippet}

<div class={compact ? 'inline-grid' : 'grid gap-1.5 text-sm'}>
  {#if !compact}
    <label for={id}>{label}</label>
  {/if}
  <Select.Root type="single" bind:value {disabled}>
    <Select.Trigger
      {id}
      aria-label={compact ? label : undefined}
      title={compact ? label + ' — ' + (labels[value] ?? value) : undefined}
      class={compact ? 'gap-1! px-2!' : undefined}
    >
      {@render optionLabel(value, compact)}
      {#if compact}<span>{label}</span>{/if}
    </Select.Trigger>
    <Select.Content {align}>
      {#each options as option (option)}
        <Select.Item value={option} label={labels[option] ?? option}
          >{@render optionLabel(option)}</Select.Item
        >
      {/each}
    </Select.Content>
  </Select.Root>
</div>
