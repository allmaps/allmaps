<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  const defaultText = 'https://viewer.allmaps.org/'

  export function formatUsage(
    text = defaultText,
    label = '',
    disabled = false
  ) {
    const props = [`text={${JSON.stringify(text)}}`]
    if (label) props.push(`aria-label={${JSON.stringify(label)}}`)
    if (disabled) props.push('disabled')
    return svelteExample(
      ["import { CopyButton } from '@allmaps/ui/code'"],
      `<CopyButton ${props.join(' ')} />`
    )
  }
</script>

<script lang="ts">
  import { CopyButton } from '$lib/code.js'
  import { Checkbox } from '$lib/checkbox.js'
  import Playground from './Playground.svelte'

  let text = $state(defaultText)
  let label = $state('')
  let disabled = $state(false)
</script>

<Playground usage={formatUsage(text, label, disabled)}>
  {#snippet preview()}
    <CopyButton {text} aria-label={label || undefined} {disabled} />
  {/snippet}
  {#snippet controls()}
    <label class="grid gap-1.5 text-sm">
      Text to copy
      <input
        class="rounded-md border border-input bg-background px-3 py-2 text-foreground"
        bind:value={text}
      />
    </label>
    <label class="grid gap-1.5 text-sm">
      Accessible label
      <input
        class="rounded-md border border-input bg-background px-3 py-2 text-foreground"
        placeholder="Copy to clipboard"
        bind:value={label}
      />
    </label>
    <Checkbox bind:checked={disabled}>Disabled</Checkbox>
  {/snippet}
</Playground>
