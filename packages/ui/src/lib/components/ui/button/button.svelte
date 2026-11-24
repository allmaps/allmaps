<script lang="ts">
  import '../../../css/ui-base.css'
  import { Button as SdkButton } from '@ui-sdk/svelte/button'
  import { cn } from '../utils.js'
  import LoadingSmall from '../../LoadingSmall.svelte'

  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes
  } from 'svelte/elements'
  import type { ButtonProps, ButtonVariant } from './types.js'

  let {
    children,
    icon,
    iconPosition = 'leading',
    loadingIndicator,
    variant = 'default',
    rounded = 'rounded',
    iconOnly = false,
    active = false,
    loading = false,
    disabled = false,
    ref = $bindable(null),
    class: className,
    onclick,
    ...restProps
  }: ButtonProps = $props()

  const variants: Record<ButtonVariant, string> = {
    default: '[--button-fill:var(--allmaps-ui-background)] text-foreground',
    primary: '[--button-fill:var(--allmaps-ui-primary)] text-white',
    destructive:
      '[--button-fill:var(--allmaps-ui-button-destructive)] text-white'
  }

  let unavailable = $derived(disabled || loading)
  let anchorAttributes = $derived(restProps as HTMLAnchorAttributes)
  let buttonAttributes = $derived(restProps as HTMLButtonAttributes)
  let classes = $derived([
    'inline-flex max-w-full shrink-0 items-center justify-center gap-2 border font-(family-name:--allmaps-ui-font-sans) text-sm leading-5 font-medium transition-colors delay-0 motion-reduce:transition-none',
    variant === 'default' ? 'border-border' : 'border-transparent',
    'no-underline bg-(--button-fill) not-disabled:not-aria-disabled:hover:bg-[color-mix(in_srgb,var(--button-fill)_95%,black)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--allmaps-ui-ring)',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-2 [&_svg]:pointer-events-none [&_svg]:shrink-0',
    'pointer-coarse:min-h-11 pointer-coarse:min-w-11',
    !unavailable && 'cursor-pointer',
    rounded === 'full' ? 'rounded-full' : 'rounded-md',
    'min-h-(--allmaps-ui-control-height)',
    iconOnly ? 'w-(--allmaps-ui-control-height) p-1.5' : 'px-3 py-2',
    active && variant !== 'destructive'
      ? '[--button-fill:var(--allmaps-ui-accent)] text-primary'
      : variants[variant],
    active && 'ring-2 ring-(--allmaps-ui-ring) ring-inset',
    className
  ])
</script>

{#snippet content()}
  {#if icon}
    <span
      aria-hidden="true"
      class={[
        'relative inline-grid shrink-0 place-items-center',
        iconPosition === 'trailing' && 'order-last'
      ]}
    >
      <span class="inline-grid place-items-center" class:invisible={loading}
        >{@render icon()}</span
      >
      {#if loading}
        <span
          data-slot="loading-indicator"
          class="absolute inset-0 grid place-items-center"
        >
          {#if loadingIndicator}
            {@render loadingIndicator()}
          {:else}
            <span class="contents motion-reduce:hidden"
              ><LoadingSmall color="currentColor" /></span
            >
            <span class="hidden motion-reduce:inline">…</span>
          {/if}
        </span>
      {/if}
    </span>
  {/if}
  {@render children?.()}
{/snippet}

<SdkButton
  disabled={unavailable}
  type={buttonAttributes.type ?? 'button'}
  aria-busy={loading || restProps['aria-busy']}
  data-variant={variant}
  class={cn(classes)}
  onclick={(event) => {
    if (event.currentTarget instanceof HTMLAnchorElement) {
      return (onclick as HTMLAnchorAttributes['onclick'])?.(
        event as MouseEvent & { currentTarget: HTMLAnchorElement }
      )
    }
    return (onclick as HTMLButtonAttributes['onclick'])?.(
      event as MouseEvent & { currentTarget: HTMLButtonElement }
    )
  }}
>
  {#snippet render({ props })}
    {#if restProps.href !== undefined}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The caller supplies the destination. -->
      <a
        {...anchorAttributes}
        {...props}
        bind:this={ref}
        href={unavailable ? undefined : restProps.href}
        type={undefined}
        role={unavailable ? 'link' : anchorAttributes.role}
        aria-disabled={unavailable || undefined}
        tabindex={unavailable ? -1 : anchorAttributes.tabindex}
        >{@render content()}</a
      >
    {:else}
      <button
        {...buttonAttributes}
        {...props}
        disabled={unavailable}
        bind:this={ref}>{@render content()}</button
      >
    {/if}
  {/snippet}
</SdkButton>
