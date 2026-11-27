<script module lang="ts">
  import exampleSource from './ListDialogExample.svelte?raw'
  import list from '../data/starred-resources.json'
  import type { ListDialogState } from '$lib/list-dialog.js'

  const states = ['Ready', 'Empty', 'Loading', 'Error'] as const
  type ExampleState = (typeof states)[number]

  const loadingMessage = 'Loading starred maps…'
  const errorMessage = 'Couldn’t load your starred maps.'

  function getState(example: ExampleState, retry: () => void): ListDialogState {
    switch (example) {
      case 'Empty':
        return { status: 'ready', items: [] }
      case 'Loading':
        return { status: 'loading', message: loadingMessage }
      case 'Error':
        return { status: 'error', message: errorMessage, retry }
      case 'Ready':
        return { status: 'ready', ...list }
    }
  }

  export function formatUsage(example: ExampleState = 'Ready') {
    const declarations = {
      Ready: "const listState: ListDialogState = { status: 'ready', ...list }",
      Empty:
        "const listState: ListDialogState = { status: 'ready', items: [] }",
      Loading: `const listState: ListDialogState = { status: 'loading', message: '${loadingMessage}' }`,
      Error: `let listState = $state<ListDialogState>({
    status: 'error',
    message: '${errorMessage}',
    retry: () => {
      listState = { status: 'ready', ...list }
    }
  })`
    }
    return exampleSource
      .replace("'$lib/button.js'", "'@allmaps/ui/button'")
      .replace(
        "'$lib/list-dialog.js'",
        "'@allmaps/ui/list-dialog'" +
          (example === 'Ready' || example === 'Error'
            ? "\n  import list from './starred-resources.json'"
            : '')
      )
      .replace(
        'let { listState }: { listState: ListDialogState } = $props()',
        () => declarations[example]
      )
      .trimEnd()
  }
</script>

<script lang="ts">
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  import ListDialogExample from './ListDialogExample.svelte'

  let example = $state<ExampleState>('Ready')
  let listState = $derived(getState(example, () => (example = 'Ready')))
</script>

<Playground usage={formatUsage(example)}>
  {#snippet preview()}
    <ListDialogExample {listState} />
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect
      label="List state"
      options={states}
      bind:value={example}
    />
  {/snippet}
</Playground>
