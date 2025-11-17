<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()
</script>

<section
  class="brochure-page not-content m-0 min-h-0 flex justify-center items-start max-w-7xl mx-auto print:text-sm"
>
  {@render children()}
</section>
