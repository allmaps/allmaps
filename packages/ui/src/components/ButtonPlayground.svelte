<script lang="ts">
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  import Playground from './Playground.svelte'
  import { Button } from '$lib/button.js'
  import type { ButtonShape, ButtonVariant } from '$lib/button.js'
  import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon'
  import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon'

  import { buttonUsage, formatButtonUsage } from './button-usage.js'
  import { variants } from './button-options.js'

  let variant = $state<ButtonVariant>('default')
  let shape = $state<ButtonShape>('rounded')
  let label = $state('Open map')
  let icon = $state<'none' | 'leading' | 'trailing' | 'only'>('leading')
  let disabled = $state(false)
  let loading = $state(false)
  let indicator = $state('Allmaps')
  let pressed = $state(false)
  let clicks = $state(0)

  $effect(() => {
    buttonUsage.set(
      formatButtonUsage({
        variant,
        shape,
        label,
        icon,
        disabled,
        loading,
        customIndicator: indicator === 'Custom',
        pressed
      })
    )
  })
</script>

{#snippet dots()}<span>•••</span>{/snippet}

{#snippet previewIcon()}
  {#if icon === 'trailing'}<ArrowRightIcon class="size-5" />{:else}<GlobeIcon
      class="size-5"
    />{/if}
{/snippet}

<Playground>
  {#snippet preview()}
    <div class="flex min-w-0 flex-col items-center gap-2 text-center">
      <Button
        {variant}
        {shape}
        {disabled}
        {loading}
        icon={icon === 'none' ? undefined : previewIcon}
        iconPosition={icon === 'trailing' ? 'trailing' : 'leading'}
        loadingIndicator={indicator === 'Custom' ? dots : undefined}
        active={pressed}
        aria-pressed={pressed || undefined}
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
      label="Shape"
      options={['rounded', 'pill']}
      bind:value={shape}
    />
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
    {#if loading && icon !== 'none'}
      <PlaygroundSelect
        label="Loading indicator"
        options={['Allmaps', 'Custom']}
        bind:value={indicator}
      />
    {/if}
    <div class="flex flex-wrap gap-4 text-sm sm:col-span-2 lg:col-span-1">
      <label class="flex min-h-11 items-center gap-2"
        ><input
          type="checkbox"
          bind:checked={disabled}
          class="size-4 accent-primary"
        />Disabled</label
      >
      <label class="flex min-h-11 items-center gap-2"
        ><input
          type="checkbox"
          bind:checked={loading}
          class="size-4 accent-primary"
        />Loading</label
      >
      <label class="flex min-h-11 items-center gap-2"
        ><input
          type="checkbox"
          bind:checked={pressed}
          class="size-4 accent-primary"
        />Pressed</label
      >
    </div>
  {/snippet}
</Playground>
