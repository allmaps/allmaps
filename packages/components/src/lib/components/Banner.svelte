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

  type Props = {
    bannerTextEnabled?: boolean
    bannerText?: string
    bannerBackgroundColor?: string
    bannerTextColor?: string
  }

  let {
    bannerTextEnabled = env.VITE_BANNER_ENABLED === 'true' || false,
    bannerText = env.VITE_BANNER_TEXT || '',
    bannerBackgroundColor = env.VITE_BANNER_BACKGROUND_COLOR || red,
    bannerTextColor = env.VITE_BANNER_TEXT_COLOR || 'white'
  }: Props = $props()
</script>

{#if bannerTextEnabled && bannerText.length > 0}
  <div
    class="banner p-0.5 text-xs text-center"
    style:color={bannerTextColor}
    style="--background-color: {bannerBackgroundColor}"
  >
    {bannerText}
  </div>
{/if}

<style scoped>
  .banner {
    --lighter-color: color-mix(in srgb, var(--background-color), white 10%);

    background: repeating-linear-gradient(
      45deg,
      var(--background-color),
      var(--background-color) 10px,
      var(--lighter-color) 10px,
      var(--lighter-color) 20px
    );
  }
</style>
