<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  export function formatUsage({
    checked = true,
    indeterminate = false,
    disabled = false
  } = {}) {
    const script = [
      "import { Checkbox } from '@allmaps/ui/checkbox'",
      '',
      `let checked = $state(${checked})`
    ]
    const props = ['bind:checked']
    if (indeterminate) {
      script.push('let indeterminate = $state(true)')
      props.push('bind:indeterminate')
    }
    if (disabled) props.push('disabled')

    return svelteExample(
      script,
      `<Checkbox ${props.join(' ')}>Show map labels</Checkbox>`
    )
  }
</script>

<script lang="ts">
  import { Checkbox } from '$lib/checkbox.js'
  import Playground from './Playground.svelte'

  let checked = $state(true)
  let indeterminate = $state(false)
  let disabled = $state(false)
</script>

<Playground usage={formatUsage({ checked, indeterminate, disabled })}>
  {#snippet preview()}
    <Checkbox bind:checked bind:indeterminate {disabled}
      >Show map labels</Checkbox
    >
  {/snippet}
  {#snippet controls()}
    <Checkbox bind:checked>Checked</Checkbox>
    <Checkbox bind:checked={indeterminate}>Indeterminate</Checkbox>
    <Checkbox bind:checked={disabled}>Disabled</Checkbox>
  {/snippet}
</Playground>
