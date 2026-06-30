<script lang="ts">
  import type { Snippet } from 'svelte'
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes
  } from 'svelte/elements'

  type SharedProps = {
    children: Snippet
    label?: Snippet
    ariaLabel?: string
    active?: boolean
    variant?: 'icon' | 'round'
    size?: 'normal' | 'large'
  }

  type ButtonProps = Omit<HTMLButtonAttributes, 'children'> &
    SharedProps & {
      element?: 'button'
      pressed?: boolean
    }

  type AnchorProps = Omit<HTMLAnchorAttributes, 'children'> &
    SharedProps & {
      element: 'a'
      disabled?: never
      pressed?: never
    }

  type Props = ButtonProps | AnchorProps

  let {
    children,
    label,
    ariaLabel,
    active = false,
    element = 'button',
    disabled = false,
    pressed,
    variant = 'icon',
    size = 'normal',
    class: className,
    ...elementProps
  }: Props = $props()

  let isButton = $derived(element === 'button')
</script>

<svelte:element
  this={element}
  {...elementProps}
  disabled={isButton ? disabled : undefined}
  aria-label={ariaLabel}
  aria-pressed={isButton ? pressed : undefined}
  class={[
    'inline-flex items-center justify-center transition-colors',
    size === 'normal' && 'size-5 pointer-coarse:size-7 pointer-coarse:p-1',
    size === 'large' && 'size-7 pointer-coarse:size-9 pointer-coarse:p-1',
    label && 'gap-2 font-medium sm:h-auto sm:w-auto sm:px-2 sm:py-1',
    variant === 'round' ? 'rounded-full' : 'rounded',
    isButton
      ? 'not-disabled:cursor-pointer disabled:text-gray'
      : 'cursor-pointer',
    isButton
      ? 'not-disabled:hover:bg-pink/10 not-disabled:hover:text-pink'
      : 'hover:bg-pink/10 hover:text-pink',
    active && 'bg-pink/10 text-pink',
    className
  ]}
>
  {#if label}
    <span
      class={[
        'size-full pointer-coarse:size-full',
        isButton ? 'sm:size-6' : 'sm:size-5'
      ]}
    >
      {@render children()}
    </span>
    <span class="hidden sm:inline pointer-coarse:hidden">
      {@render label()}
    </span>
  {:else}
    {@render children()}
  {/if}
</svelte:element>
