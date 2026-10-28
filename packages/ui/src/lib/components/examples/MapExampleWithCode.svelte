<script lang="ts">
  import MapExample from './MapExample.svelte'
  import CodeBlock from '../CodeBlock.svelte'
  import type { MapExampleImplementationProps } from '../../examples/types.js'

  let {
    codeTheme,
    initialCode,
    children: sourceContent,
    annotationUrl = $bindable(),
    opacity = $bindable(1),
    transformation = $bindable('annotation'),
    viewMode = $bindable('fit'),
    ...props
  }: MapExampleImplementationProps = $props()
</script>

<MapExample
  {...props}
  bind:annotationUrl
  bind:opacity
  bind:transformation
  bind:viewMode
>
  {#snippet children(code)}
    {#if sourceContent}
      {@render sourceContent(code)}
    {:else}
      <div class="source">
        <CodeBlock
          code={code.javascript}
          language="javascript"
          theme={codeTheme}
          initial={initialCode?.javascript}
        />
        <p>Add a map container to your page:</p>
        <CodeBlock
          code={code.html}
          language="html"
          theme={codeTheme}
          initial={initialCode?.html}
        />
        <p>Install the packages:</p>
        <CodeBlock
          code={code.bash}
          language="bash"
          theme={codeTheme}
          initial={initialCode?.bash}
        />
        <p>The example uses a bundler such as Vite.</p>
      </div>
    {/if}
  {/snippet}
</MapExample>

<style>
  .source {
    margin-top: 1rem;
  }
  p {
    margin: 0.75rem 0;
    font-size: 0.875rem;
  }
</style>
