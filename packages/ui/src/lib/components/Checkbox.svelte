<script lang="ts">
  import '../css/ui-base.css'
  import { Checkbox as CheckboxPrimitive } from '@ui-sdk/svelte/checkbox'
  import { elementRef } from './ui/element-ref.js'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import MinusIcon from 'phosphor-svelte/lib/MinusIcon'
  import type { NamedProps } from './ui/types.js'
  import type { ComponentProps, Snippet } from 'svelte'
  import { cn } from './ui/utils.js'

  const uid = $props.id()
  let {
    id = uid,
    checked = $bindable(false),
    indeterminate = $bindable(false),
    ref = $bindable(null),
    class: className,
    children,
    onCheckedChange,
    onIndeterminateChange,
    ...rest
  }: Omit<
    NamedProps<ComponentProps<typeof CheckboxPrimitive>>,
    'checked' | 'defaultChecked' | 'onCheckedChange' | 'children'
  > & {
    checked?: boolean
    indeterminate?: boolean
    ref?: HTMLButtonElement | null
    onCheckedChange?: (value: boolean) => void
    onIndeterminateChange?: (value: boolean) => void
    children?: Snippet
  } = $props()
</script>

{#snippet control()}
  <CheckboxPrimitive
    {...rest}
    defaultChecked={undefined}
    {id}
    {@attach elementRef<HTMLButtonElement>(
      () => ref,
      (node) => (ref = node)
    )}
    bind:checked={
      () => (indeterminate ? 'indeterminate' : checked),
      (next) => {
        if (indeterminate !== (next === 'indeterminate')) {
          indeterminate = next === 'indeterminate'
          onIndeterminateChange?.(indeterminate)
        }
        checked = next === true
        onCheckedChange?.(checked)
      }
    }
    data-slot="checkbox"
    class={cn(
      'peer inline-grid size-4.5 shrink-0 cursor-pointer place-items-center rounded-[5px] border border-muted-foreground/70 bg-background p-0 shadow-xs',
      'data-unchecked:enabled:hover:border-foreground data-unchecked:enabled:hover:bg-muted',
      'data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary text-white',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 delay-0 motion-safe:transition-colors',
      className
    )}
  >
    {#if indeterminate}
      <MinusIcon class="size-3.5" weight="bold" aria-hidden="true" />
    {:else if checked}
      <CheckIcon class="size-3.5" weight="bold" aria-hidden="true" />
    {/if}
  </CheckboxPrimitive>
{/snippet}

{#if children}
  <div class="inline-flex w-fit items-center">
    {@render control()}
    <label
      for={id}
      class="inline-flex min-h-8 cursor-pointer items-center ps-2.5 font-allmaps-ui text-sm font-medium leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 pointer-coarse:min-h-11"
    >
      {@render children()}
    </label>
  </div>
{:else}
  {@render control()}
{/if}
