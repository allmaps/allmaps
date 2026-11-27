<script module lang="ts">
  import ShortDialogExample from './ShortDialogExample.svelte'
  import LongDialogExample from './LongDialogExample.svelte'
  import MovingMapsDialogExample from './MovingMapsDialogExample.svelte'
  import shortSource from './ShortDialogExample.svelte?raw'
  import longSource from './LongDialogExample.svelte?raw'
  import movingMapsSource from './MovingMapsDialogExample.svelte?raw'

  export type DialogExampleProps = {
    backdrop?: 'default' | 'dark'
    onOpenChange?: (open: boolean) => void
  }

  const examples = [
    { component: ShortDialogExample, source: shortSource },
    { component: LongDialogExample, source: longSource },
    { component: MovingMapsDialogExample, source: movingMapsSource }
  ]

  export function formatUsage(source = shortSource, backdrop = 'Default') {
    return source
      .replace("'$lib/button.js'", "'@allmaps/ui/button'")
      .replace("'$lib/dialog.js'", "'@allmaps/ui/dialog'")
      .replace(
        "import MovingMapsBackground from '$lib/components/MovingMapsBackground.svelte'",
        "import { MovingMapsBackground } from '@allmaps/ui'"
      )
      .replace(
        /  import type \{ DialogExampleProps \}[^\n]*\n\n[^\n]*\$props\(\)\n/,
        ''
      )
      .replace(' {onOpenChange}', '')
      .replace(' {backdrop}', backdrop === 'Dark' ? ' backdrop="dark"' : '')
      .trimEnd()
  }
</script>

<script lang="ts">
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'

  let source = $state(shortSource)
  let backdrop = $state('Default')
</script>

<Playground usage={formatUsage(source, backdrop)}>
  {#snippet preview()}
    <div class="flex flex-wrap justify-center gap-3">
      {#each examples as { component: Example, source: exampleSource } (Example)}
        <Example
          backdrop={backdrop === 'Dark' ? 'dark' : 'default'}
          onOpenChange={(open) => {
            if (open) source = exampleSource
          }}
        />
      {/each}
    </div>
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect
      label="Backdrop"
      options={['Default', 'Dark']}
      bind:value={backdrop}
    />
  {/snippet}
</Playground>
