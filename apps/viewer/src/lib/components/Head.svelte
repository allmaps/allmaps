<script lang="ts">
  import { page } from '$app/state'

  import favicon from '$lib/assets/favicon.png'

  import type { Source } from '$lib/types/shared.js'

  type Props = {
    title?: string
    source?: Source
  }

  let { title, source }: Props = $props()

  const OG_IMAGE_SIZE = [1200, 630]

  let description =
    'View warped maps and their metadata with Allmaps Viewer. Explore georeferenced maps, compare them with modern maps, and discover the history behind each map. Allmaps Viewer provides an interactive platform for visualizing and analyzing historical maps in a geospatial context.'

  let ogImageUrl = $derived.by(() => {
    if (source?.allmapsId) {
      // return `https://preview.allmaps.org/${source?.allmapsId}.jpg`
      return `http://localhost:5514/${source?.allmapsId}.jpg`
    }
  })
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{title || 'Allmaps Viewer'}</title>
  <meta name="title" content={title} />
  <meta property="og:title" content={title} />

  {#if description}
    <meta name="description" content={description} />
    <meta property="og:description" content={description} />
  {/if}

  {#if ogImageUrl}
    <meta property="og:image" content={ogImageUrl} />
    <meta name="og:image:secure_url" content={ogImageUrl} />
    <meta property="og:image:width" content={String(OG_IMAGE_SIZE[0])} />
    <meta property="og:image:height" content={String(OG_IMAGE_SIZE[1])} />
  {/if}

  <meta property="og:url" content={page.url.href} />
  <meta property="og:site_name" content="Allmaps Viewer" />
  <meta property="og:locale" content="en" />
  <meta property="og:type" content="website" />
</svelte:head>
