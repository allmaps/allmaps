<script lang="ts">
  import { page } from '$app/state'
  import MaskGridHero from '$lib/components/MaskGridHero.svelte'

  let { children, data } = $props()
</script>

<main class="content-page">
  {#if data.metadata.hero}
    <MaskGridHero {...data.metadata.hero} pathname={page.url.pathname} />
  {/if}

  <section
    class:mask-hero-content={Boolean(data.metadata.hero)}
    class="copy-width flow-root prose max-w-none prose-a:font-bold prose-a:text-pink prose-headings:text-black pt-10 pb-16 has-[>.page-intro:first-child]:pt-0"
  >
    {@render children()}
  </section>
</main>
