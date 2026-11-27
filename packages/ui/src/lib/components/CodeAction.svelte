<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  import * as Tooltip from '../tooltip.js'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { cn } from './ui/utils.js'

  let {
    label,
    tooltip = label,
    open = $bindable(false),
    disabled = false,
    onOpenChangeComplete,
    class: className,
    children,
    ...attributes
  }: Omit<HTMLButtonAttributes, 'children'> & {
    label: string
    tooltip?: string
    open?: boolean
    onOpenChangeComplete?: (open: boolean) => void
    children: Snippet
  } = $props()

  let mounted = $state(false)
  onMount(() => {
    mounted = true
  })
</script>

<Tooltip.Root bind:open closeOnPress={false} {onOpenChangeComplete}>
  <Tooltip.Trigger
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
  </Tooltip.Trigger>
  <Tooltip.Content side="left">{tooltip}</Tooltip.Content>
</Tooltip.Root>
