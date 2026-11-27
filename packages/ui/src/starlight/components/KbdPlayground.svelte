<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  export function formatUsage(keys = ['Enter']) {
    const caps = keys.map((key) => `<Kbd.Root>${key}</Kbd.Root>`)
    return svelteExample(
      ["import * as Kbd from '@allmaps/ui/kbd'"],
      caps.length === 1
        ? caps[0]
        : `<Kbd.Group>\n  ${caps.join('\n  ')}\n</Kbd.Group>`
    )
  }
</script>

<script lang="ts">
  import * as Kbd from '$lib/kbd.js'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'

  const examples = ['Enter', 'Escape', 'Shift + Enter']
  let example = $state('Enter')
  const keys = $derived(example.split(' + '))
</script>

<Playground usage={formatUsage(keys)}>
  {#snippet preview()}
    {#if keys.length === 1}
      <Kbd.Root>{keys[0]}</Kbd.Root>
    {:else}
      <Kbd.Group>
        {#each keys as key (key)}
          <Kbd.Root>{key}</Kbd.Root>
        {/each}
      </Kbd.Group>
    {/if}
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect label="Keys" options={examples} bind:value={example} />
  {/snippet}
</Playground>
