<script lang="ts">
  import { onDestroy } from 'svelte'
  import CodeAction from './CodeAction.svelte'
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  let {
    text,
    disabled = false,
    'aria-label': accessibleLabel,
    ...attributes
  }: Omit<HTMLButtonAttributes, 'children' | 'onclick' | 'type'> & {
    text: string
  } = $props()

  const label = $derived(accessibleLabel || 'Copy to clipboard')
  let open = $state(false)
  let feedback = $state('')
  let attempt = 0
  let timer: ReturnType<typeof setTimeout>
  onDestroy(() => {
    attempt++
    clearTimeout(timer)
  })

  async function copy() {
    const current = ++attempt
    clearTimeout(timer)
    let message = 'Copied!'
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      message = 'Copy failed'
    }
    if (current !== attempt) return
    feedback = message
    open = true
    timer = setTimeout(() => {
      open = false
    }, 2000)
  }
</script>

<CodeAction
  {...attributes}
  {label}
  tooltip={feedback || label}
  disabled={disabled || text === ''}
  bind:open
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) feedback = ''
  }}
  onclick={copy}
>
  {#if feedback === 'Copied!'}
    <CheckIcon class="size-4" aria-hidden="true" />
  {:else}
    <CopyIcon class="size-4" aria-hidden="true" />
  {/if}
</CodeAction>
<span role="status" class="sr-only">{feedback}</span>
