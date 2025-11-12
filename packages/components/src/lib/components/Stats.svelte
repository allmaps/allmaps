<script lang="ts">
  // Using import.meta.env in favor of $env/dynamic/public
  // to ensure @allmaps/ui also works in Astro, for docs.allmaps.org
  // TODO: are there other ways to do this?
  // Using import.meta.env makes vite say:
  //   "Avoid usage of `import.meta.env` in your code. It requires a bundler to work.
  //   Consider using packages like `esm-env` instead which provide cross-bundler-compatible
  //   environment variables.

  // import.meta.env uses:
  //   VITE_STATS_WEBSITE_ID
  // $env/dynamic/public uses:
  //   PUBLIC_STATS_WEBSITE_ID

  // import { env } from '$env/dynamic/public'
  const env = import.meta.env

  type Props = {
    statsWebsiteId?: string
  }

  let { statsWebsiteId = env.VITE_STATS_WEBSITE_ID || '' }: Props = $props()
</script>

<svelte:head>
  {#if statsWebsiteId}
    <script
      async
      src="https://stats.allmaps.org/script.js"
      data-website-id={statsWebsiteId}
    ></script>
  {/if}
</svelte:head>
