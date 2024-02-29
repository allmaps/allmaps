<script lang="ts">
  // Using import.meta.env in favor of $env/dynamic/public
  // to ensure @allmaps/ui also works in Astro, for docs.allmaps.org
  // TODO: are there other ways to do this?
  // Using import.meta.env makes vite say:
  //   "Avoid usage of `import.meta.env` in your code. It requires a bundler to work.
  //   Consider using packages like `esm-env` instead which provide cross-bundler-compatible
  //   environment variables.

  // import { env } from '$env/dynamic/public'
  const env = import.meta.env
</script>

<svelte:head>
  {#if env.PUBLIC_STATS_WEBSITE_ID}
    <script
      async
      src="https://stats.allmaps.org/script.js"
      data-website-id={env.PUBLIC_STATS_WEBSITE_ID}
    ></script>
  {/if}
</svelte:head>
