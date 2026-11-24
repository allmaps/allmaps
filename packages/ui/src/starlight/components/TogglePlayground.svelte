<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  export function formatUsage({
    star = false,
    rounded = 'rounded',
    pressed = false,
    disabled = false
  } = {}) {
    const component = star ? 'StarToggle' : 'Toggle'
    const binding = star ? 'starred' : 'pressed'
    const props = [
      !star && rounded === 'full' && 'rounded="full"',
      `bind:${binding}`,
      disabled && 'disabled'
    ]
      .filter(Boolean)
      .join(' ')

    return svelteExample(
      [
        `import { ${component} } from '@allmaps/ui/${star ? 'star-toggle' : 'toggle'}'`,
        '',
        `let ${binding} = $state(${pressed})`
      ],
      star
        ? `<StarToggle ${props} aria-label="Star map of Amsterdam" />`
        : `<Toggle ${props}>Map labels</Toggle>`
    )
  }
</script>

<script lang="ts">
  import { Checkbox } from '$lib/checkbox.js'
  import { StarToggle } from '$lib/star-toggle.js'
  import { Toggle, type Rounded } from '$lib/toggle.js'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'

  let { star = false }: { star?: boolean } = $props()
  let rounded = $state<Rounded>('rounded')
  let pressed = $state(false)
  let disabled = $state(false)
</script>

<Playground usage={formatUsage({ star, rounded, pressed, disabled })}>
  {#snippet preview()}
    {#if star}
      <StarToggle
        aria-label="Star map of Amsterdam"
        bind:starred={pressed}
        {disabled}
      />
    {:else}
      <Toggle bind:pressed {rounded} {disabled}>Map labels</Toggle>
    {/if}
  {/snippet}
  {#snippet controls()}
    {#if !star}
      <PlaygroundSelect
        label="Rounded"
        options={['rounded', 'full']}
        bind:value={rounded}
      />
    {/if}
    <Checkbox bind:checked={pressed}>{star ? 'Starred' : 'Pressed'}</Checkbox>
    <Checkbox bind:checked={disabled}>Disabled</Checkbox>
  {/snippet}
</Playground>
