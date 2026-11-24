<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
  } from '@ui-sdk/svelte/tooltip'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { cn } from './ui/utils.js'

  let {
    label,
    tooltip = label,
    open = $bindable(false),
    disabled = false,
    class: className,
    children,
    ...attributes
  }: Omit<HTMLButtonAttributes, 'children'> & {
    label: string
    tooltip?: string
    open?: boolean
    children: Snippet
  } = $props()

  let mounted = $state(false)
  onMount(() => {
    mounted = true
  })
</script>

<Tooltip bind:open closeOnPress={false}>
  <TooltipTrigger
    {...attributes}
    type="button"
    aria-label={attributes['aria-label'] ?? label}
    disabled={!mounted || disabled}
    class={cn(
      'inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded border border-solid border-[color:var(--allmaps-code-button-border,var(--border-color,var(--allmaps-ui-border,#bac4c8)))] bg-transparent text-[color:var(--allmaps-code-button-foreground,inherit)] hover:bg-[color:color-mix(in_srgb,var(--allmaps-code-button-background,currentColor)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50',
      className
    )}
  >
    {@render children()}
  </TooltipTrigger>
  <TooltipContent
    side="left"
    sideOffset={6}
    class="pointer-events-none z-50 w-max rounded bg-foreground px-2 py-1 font-allmaps-ui text-xs font-medium text-background shadow-sm"
  >
    {#snippet render({ props })}
      <div {...props} hidden={!open}>{tooltip}</div>
    {/snippet}
  </TooltipContent>
</Tooltip>
