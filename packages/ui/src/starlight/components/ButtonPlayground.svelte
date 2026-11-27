<script lang="ts">
  import { Checkbox } from '$lib/checkbox.js'
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  import Playground from './Playground.svelte'
  import { Button } from '$lib/button.js'
  import type { ButtonVariant, Rounded } from '$lib/button.js'
  import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon'
  import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon'

  import { formatButtonUsage } from './button-usage.js'
  import { variants } from './button-options.js'

  let variant = $state<ButtonVariant>('default')
  let rounded = $state<Rounded>('rounded')
  let label = $state('Open map')
  let icon = $state<'none' | 'leading' | 'trailing' | 'only'>('leading')
  let disabled = $state(false)
  let loading = $state(false)
  let indicator = $state('Allmaps')
  let clicks = $state(0)
</script>

{#snippet dots()}<span>•••</span>{/snippet}

{#snippet previewIcon()}
  {#if icon === 'trailing'}<ArrowRightIcon class="size-5" />{:else}<GlobeIcon
      class="size-5"
    />{/if}
{/snippet}

<Playground
  usage={formatButtonUsage({
    variant,
    rounded,
    label,
    icon,
    disabled,
    loading,
    customIndicator: indicator === 'Custom'
  })}
>
  {#snippet preview()}
    <div class="flex min-w-0 flex-col items-center gap-2 text-center">
      <Button
        {variant}
        {rounded}
        {disabled}
        {loading}
        icon={icon === 'none' ? undefined : previewIcon}
        iconPosition={icon === 'trailing' ? 'trailing' : 'leading'}
        loadingIndicator={indicator === 'Custom' ? dots : undefined}
        iconOnly={icon === 'only'}
        aria-label={icon === 'only' ? label || 'Open map' : undefined}
        onclick={() => clicks++}
      >
        {#if icon !== 'only'}<span class="min-w-0 break-words">{label}</span
          >{/if}
      </Button>
      <p class="text-sm text-muted-foreground" aria-live="polite">
        Activated {clicks}
        {clicks === 1 ? 'time' : 'times'}
      </p>
    </div>
  {/snippet}
  {#snippet controls()}
    <label class="grid gap-1.5 text-sm"
      >Label<input
        class="rounded-md border border-input bg-background px-3 py-2 text-foreground"
        bind:value={label}
      /></label
    >
    <PlaygroundSelect label="Variant" options={variants} bind:value={variant} />
    <PlaygroundSelect
      label="Rounded"
      options={['rounded', 'full']}
      bind:value={rounded}
    />
  {/snippet}
  {#snippet secondColumn()}
    <PlaygroundSelect
      label="Icon"
      options={['none', 'leading', 'trailing', 'only']}
      labels={{
        none: 'None',
        leading: 'Before label',
        trailing: 'After label',
        only: 'Icon only'
      }}
      bind:value={icon}
    />
    <PlaygroundSelect
      label="Loading indicator"
      options={['Allmaps', 'Custom']}
      disabled={!loading || icon === 'none'}
      bind:value={indicator}
    />
    <Checkbox bind:checked={disabled}>Disabled</Checkbox>
    <Checkbox bind:checked={loading}>Loading</Checkbox>
  {/snippet}
</Playground>
