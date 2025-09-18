<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  let { children }: Props = $props()
</script>

<kbd
  class="ml-1 min-h-6 py-1 px-1.5
  bg-white border border-gray-200 font-mono text-xs
  text-gray-800 shadow-sm rounded-md">{@render children()}</kbd
>
