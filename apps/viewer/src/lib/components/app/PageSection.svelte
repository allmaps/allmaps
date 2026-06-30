<script lang="ts">
  import type { Snippet } from 'svelte'
  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()
</script>

<section
  class="relative mx-auto flex flex-col items-center p-4 max-w-full md:max-w-4xl gap-4"
>
  {@render children()}
</section>
