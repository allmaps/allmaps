<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()
</script>

<section
  class="brochure-page not-content print:[&_h3]:font-bold m-0 min-h-0 flex justify-center items-start max-w-7xl mx-auto print:text-sm"
>
  {@render children()}
</section>

<style>
  @media screen {
    :global(.mask-hero-content) .brochure-page {
      width: min(100% - 2 * var(--page-gutter), var(--container-wide));
      max-width: none;
    }

    :global(.mask-hero-content) .brochure-page > :global(ol),
    :global(.mask-hero-content) .brochure-page > :global(div) {
      padding-inline: 0;
    }
  }
</style>
