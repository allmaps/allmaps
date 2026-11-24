<script lang="ts">
  import {
    CodeBlock,
    DownloadButton,
    type CodeColorMode,
    type RenderedCodeBlock
  } from '$lib/code.js'
  import { Checkbox } from '$lib/checkbox.js'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  import {
    defaultExample,
    examples,
    formatCodeBlockUsage,
    type CodeExample
  } from './code-block-examples.js'

  let { initial }: { initial: RenderedCodeBlock } = $props()
  const options = Object.keys(examples) as (keyof typeof examples)[]
  let selected = $state<CodeExample>(defaultExample)
  let colorMode = $state<CodeColorMode>('auto')
  let showDownload = $state(true)
  let wrap = $state(true)
  let labels = $state(true)
  let fold = $state(false)
  const example = $derived(examples[selected])
</script>

{#snippet downloadAction()}
  <DownloadButton text={example.code} filename={example.downloadFilename} />
{/snippet}

<Playground
  usage={formatCodeBlockUsage(selected, {
    showDownload,
    wrap,
    labels,
    fold,
    colorMode
  })}
>
  {#snippet preview()}
    <div class="w-full min-w-0 [--allmaps-code-max-height:28rem]">
      <CodeBlock
        code={example.code}
        language={example.language}
        title={example.title}
        {colorMode}
        {initial}
        {wrap}
        mark={labels ? example.mark : []}
        folds={fold ? example.folds : []}
        headerActions={showDownload ? downloadAction : undefined}
      />
    </div>
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect
      label="Example"
      {options}
      bind:value={
        () => selected,
        (value) => {
          selected = value as CodeExample
          colorMode = selected === 'Terminal command' ? 'dark' : 'auto'
        }
      }
    />
    <PlaygroundSelect
      label="Color mode"
      options={['auto', 'system', 'light', 'dark']}
      labels={{
        auto: 'Page theme',
        system: 'System',
        light: 'Light',
        dark: 'Dark'
      }}
      bind:value={colorMode}
    />
    <Checkbox bind:checked={showDownload}>Show download button</Checkbox>
  {/snippet}
  {#snippet secondColumn()}
    <Checkbox bind:checked={wrap}>Wrap lines</Checkbox>
    <Checkbox bind:checked={labels} disabled={!example.mark.length}
      >Label line ranges</Checkbox
    >
    <Checkbox bind:checked={fold} disabled={!example.folds.length}
      >Fold lines</Checkbox
    >
  {/snippet}
</Playground>
