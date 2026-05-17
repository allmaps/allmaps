<script lang="ts">
  import type { Snippet } from 'svelte'
  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()
</script>

<!-- <section class="container mx-auto p-2"> -->
<!-- <section class="mx-auto p-2 sm:max-w-sm md:max-w-md lg:max-w-sm xl:max-w-4xl"> -->
<section
  class="relative mx-auto flex flex-col items-center p-4 max-w-full md:max-w-4xl gap-4"
>
  {@render children()}
</section>
