<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()
</script>

<section
  class="not-content min-h-0 flex justify-center items-start max-w-7xl mx-auto"
>
  {@render children()}
</section>
