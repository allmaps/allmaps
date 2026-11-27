<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte'
  import type { RenderedCodeBlock } from '$lib/code/types.js'
  import { playgroundUsage } from './playground-usage.js'

  let { initial, title }: { initial: RenderedCodeBlock; title: string } =
    $props()
</script>

<CodeBlock
  code={$playgroundUsage ?? initial.code}
  language={initial.language}
  {title}
  {initial}
/>
