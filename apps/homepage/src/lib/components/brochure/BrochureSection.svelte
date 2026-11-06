<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    colorClasses: string
  }

  const { children, colorClasses }: Props = $props()
</script>

<section
  class="brochure-section m-0 min-h-0 justify-center items-start max-w-4xl mx-auto p-4 print:text-sm"
>
  <div class={[colorClasses, 'prose max-w-none p-4 md:p-8 rounded-xl']}>
    {@render children()}
  </div>
</section>

<style>
  @media screen {
    .brochure-section {
      width: min(100% - 2 * var(--page-gutter), var(--container-wide));
      max-width: none;
      padding-inline: 0;
    }
  }
</style>
