<script lang="ts">
  import MapExample from './MapExample.svelte'
  import { CodeBlock } from '@allmaps/ui/code'
  import type { MapExampleImplementationProps } from '../../lib/examples/types.js'

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
      <div class="mt-4">
        <CodeBlock
          code={code.javascript}
          language="javascript"
          theme={codeTheme}
          initial={initialCode?.javascript}
        />
        <p class="my-3 mx-0 text-sm">Add a map container to your page:</p>
        <CodeBlock
          code={code.html}
          language="html"
          theme={codeTheme}
          initial={initialCode?.html}
        />
        <p class="my-3 mx-0 text-sm">Install the packages:</p>
        <CodeBlock
          code={code.bash}
          language="bash"
          theme={codeTheme}
          initial={initialCode?.bash}
        />
        <p class="my-3 mx-0 text-sm">
          The example uses a bundler such as Vite.
        </p>
      </div>
    {/if}
  {/snippet}
</MapExample>
