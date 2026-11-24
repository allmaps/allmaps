<script module lang="ts">
  import shortSource from './ShortDialogExample.svelte?raw'
  import longSource from './LongDialogExample.svelte?raw'

  export function formatUsage(example = 'Short') {
    const source = example === 'Long' ? longSource : shortSource
    return source
      .replace("'$lib/button.js'", "'@allmaps/ui/button'")
      .replace("'$lib/dialog.js'", "'@allmaps/ui/dialog'")
      .trimEnd()
  }
</script>

<script lang="ts">
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  import ShortDialogExample from './ShortDialogExample.svelte'
  import LongDialogExample from './LongDialogExample.svelte'

  let example = $state('Short')
</script>

<Playground usage={formatUsage(example)}>
  {#snippet preview()}
    {#if example === 'Long'}
      <LongDialogExample />
    {:else}
      <ShortDialogExample />
    {/if}
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect
      label="Example"
      options={['Short', 'Long']}
      bind:value={example}
    />
  {/snippet}
</Playground>
