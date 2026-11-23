<script lang="ts">
  import * as Kbd from '$lib/kbd.js'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'

  const examples = ['Enter', 'Escape', 'Shift + Enter']
  let example = $state('Enter')
</script>

<Playground>
  {#snippet preview()}
    <Kbd.Group>
      {#each example.split(' + ') as key (key)}
        <Kbd.Root>{key}</Kbd.Root>
      {/each}
    </Kbd.Group>
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect label="Keys" options={examples} bind:value={example} />
  {/snippet}
</Playground>
