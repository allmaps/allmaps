<script lang="ts">
  import { red } from '@allmaps/tailwind'

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

  export let bannerText = env.VITE_BANNER_TEXT || ''
  export let bannerBackgroundColor = env.VITE_BANNER_BACKGROUND_COLOR || red
  export let bannerTextColor = env.VITE_BANNER_TEXT_COLOR || 'white'
</script>

{#if bannerText.length > 0}
  <div
    class="p-0.5 text-xs text-center"
    style:color={bannerTextColor}
    style:background-color={bannerBackgroundColor}
  >
    {bannerText}
  </div>
{/if}
