<script lang="ts">
  import { page } from '$app/state'
  import { PUBLIC_HOMEPAGE_BASE_URL } from '$env/static/public'

  import { defaultPageMetadata } from '$lib/page-metadata.js'

  import type { PageMetadata } from '$lib/page-metadata.js'

  const metadata: PageMetadata = $derived(
    page.data.pageMetadata ?? defaultPageMetadata
  )
  const isNotFound = $derived(
    page.status === 404 || page.url.pathname.replace(/\/$/, '') === '/404'
  )
  const isError = $derived(page.status >= 400 || isNotFound)
  const title = $derived(
    isError
      ? `Allmaps: ${isNotFound ? 'Page not found' : 'Something went wrong'}`
      : metadata.title
  )
  const description = $derived(
    isError
      ? isNotFound
        ? 'The page you’re looking for doesn’t exist or has moved.'
        : 'The page could not be loaded. Please try again in a moment.'
      : metadata.description || defaultPageMetadata.description
  )
  const type = $derived(isError ? 'website' : (metadata.type ?? 'website'))
  const canonicalUrl = $derived(
    new URL(page.url.pathname, PUBLIC_HOMEPAGE_BASE_URL).href
  )
  const imageUrl = new URL('/allmaps.jpg', PUBLIC_HOMEPAGE_BASE_URL).href
  const imageAlt =
    'Allmaps logo on a blue radial gradient with colorful map outlines'
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content={type} />
  <meta property="og:site_name" content="Allmaps" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={imageUrl} />
  {#if imageUrl.startsWith('https:')}
    <meta property="og:image:secure_url" content={imageUrl} />
  {/if}
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={imageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />
  <meta name="twitter:image:alt" content={imageAlt} />
</svelte:head>
