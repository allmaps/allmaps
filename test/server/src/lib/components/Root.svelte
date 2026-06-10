<script lang="ts">
  import { onMount } from 'svelte'

  import CopyLink from './CopyLink.svelte'

  type Link = {
    label: string
    href: string
  }

  type ImageFixture = {
    id: string
    label: string
    imageLabel?: string
    manifestLabel?: string
    originalImageAnnotation: string
    width: number
    height: number
    annotation: string
    imageService2: string
    imageService3: string
    manifests?: {
      iiif2: string
      iiif3: string
      variants: Link[]
    }
    errors: {
      infoJsons: Link[]
      annotations: Link[]
      manifests: Link[]
    }
  }

  type CombinedResources = {
    annotations: Link[]
    manifests: Link[]
  }

  type Catalog = {
    combinedImages: CombinedResources
    images: ImageFixture[]
  }

  const corsModes = ['cors', 'no-cors'] as const
  const corsModeLabels = {
    cors: 'With CORS headers',
    'no-cors': 'No CORS headers'
  } as const

  let catalog = $state<Catalog>({
    combinedImages: {
      annotations: [],
      manifests: []
    },
    images: []
  })
  let loading = $state(true)
  let error = $state<string>()

  onMount(async () => {
    try {
      const response = await fetch('/cors')

      if (!response.ok) {
        throw new Error(`Could not load fixture catalog: ${response.status}`)
      }

      catalog = await response.json()
    } catch (caughtError) {
      error =
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not load fixture catalog'
    } finally {
      loading = false
    }
  })

  function withCorsMode(url: string, corsMode: (typeof corsModes)[number]) {
    return url.replace(
      `${window.location.origin}/cors`,
      `${window.location.origin}/${corsMode}`
    )
  }

  function getLinks(image: ImageFixture, corsMode: (typeof corsModes)[number]) {
    const imageService2 = withCorsMode(image.imageService2, corsMode)
    const imageService3 = withCorsMode(image.imageService3, corsMode)
    const withMode = (link: Link): Link => ({
      ...link,
      href: withCorsMode(link.href, corsMode)
    })
    const manifests = image.manifests
      ? {
          iiif2: withCorsMode(image.manifests.iiif2, corsMode),
          iiif3: withCorsMode(image.manifests.iiif3, corsMode),
          variants: image.manifests.variants.map(withMode)
        }
      : undefined

    return {
      imageService2,
      imageService3,
      annotation: withCorsMode(image.annotation, corsMode),
      manifests,
      errors: {
        infoJsons: image.errors.infoJsons.map(withMode),
        annotations: image.errors.annotations.map(withMode),
        manifests: image.errors.manifests.map(withMode)
      },
      examples: [
        {
          label: 'Full image, 600px wide',
          href: `${imageService2}/full/600,/0/default.jpg`
        },
        {
          label: 'Pixel region, square resize',
          href: `${imageService2}/0,0,512,512/256,256/0/default.jpg`
        },
        {
          label: 'Percentage region, 400px wide',
          href: `${imageService2}/pct:10,10,50,50/400,/0/default.jpg`
        },
        {
          label: 'Confined WebP thumbnail',
          href: `${imageService3}/full/!300,300/0/default.webp`
        }
      ]
    }
  }

  function getCombinedLinks(corsMode: (typeof corsModes)[number]) {
    const withMode = (link: Link): Link => ({
      ...link,
      href: withCorsMode(link.href, corsMode)
    })

    return {
      annotations: catalog.combinedImages.annotations.map(withMode),
      manifests: catalog.combinedImages.manifests.map(withMode)
    }
  }
</script>

<svelte:head>
  <title>Allmaps IIIF test server</title>
</svelte:head>

<main class="min-h-screen bg-slate-50 px-5 py-8 text-slate-950 md:px-8">
  <div class="mx-auto max-w-6xl">
    <h1 class="mb-2 text-3xl font-bold">Allmaps IIIF test server</h1>
    <p class="mb-7">
      Fixture images, annotations, manifests, and example image requests.
    </p>

    {#if loading}
      <p>Loading fixtures...</p>
    {:else if error}
      <p class="text-red-800">{error}</p>
    {:else}
      <article
        class="mt-8 overflow-hidden rounded-lg border border-slate-300 bg-white"
      >
        <header class="border-b border-slate-200 bg-white p-4">
          <h2 class="mb-1.5 text-2xl leading-tight font-bold">
            Combined Images
          </h2>
          <p class="text-slate-600">
            Annotation and manifest fixtures spanning all images.
          </p>
        </header>
        <div class="grid grid-cols-1 gap-4 bg-slate-100 p-4 lg:grid-cols-2">
          {#each corsModes as corsMode (corsMode)}
            {@const links = getCombinedLinks(corsMode)}
            <section
              class={[
                'overflow-hidden rounded-lg border',
                corsMode === 'cors'
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
              ]}
            >
              <header
                class={[
                  'px-3.5 py-3 text-white',
                  corsMode === 'cors' ? 'bg-emerald-800' : 'bg-amber-800'
                ]}
              >
                <h3 class="text-sm leading-none font-bold uppercase">
                  {corsModeLabels[corsMode]}
                </h3>
              </header>

              <div
                class={[
                  'border-t p-3.5',
                  corsMode === 'cors'
                    ? 'border-emerald-200'
                    : 'border-amber-200'
                ]}
              >
                <h4 class="mb-2 text-sm leading-tight font-bold text-slate-800">
                  Combined Annotations
                </h4>
                <ul class="grid list-none gap-1.5 p-0">
                  {#each links.annotations as annotation (annotation.href)}
                    <li>
                      <CopyLink
                        href={annotation.href}
                        label={annotation.label}
                      />
                    </li>
                  {/each}
                </ul>
              </div>

              <div
                class={[
                  'border-t p-3.5',
                  corsMode === 'cors'
                    ? 'border-emerald-200'
                    : 'border-amber-200'
                ]}
              >
                <h4 class="mb-2 text-sm leading-tight font-bold text-slate-800">
                  Combined Manifests
                </h4>
                <ul class="grid list-none gap-1.5 p-0">
                  {#each links.manifests as manifest (manifest.href)}
                    <li>
                      <CopyLink href={manifest.href} label={manifest.label} />
                    </li>
                  {/each}
                </ul>
              </div>
            </section>
          {/each}
        </div>
      </article>

      {#each catalog.images as image (image.id)}
        <article
          class="mt-8 overflow-hidden rounded-lg border border-slate-300 bg-white"
        >
          <header
            class="grid items-start gap-5 border-b border-slate-200 bg-white p-4 sm:grid-cols-[minmax(180px,280px)_minmax(0,1fr)]"
          >
            <img
              class="w-full max-w-full rounded-md border border-slate-300 sm:max-w-[280px]"
              src={`${image.imageService2}/full/320,/0/default.jpg`}
              alt={image.label}
            />
            <div>
              <h2 class="mb-1.5 text-2xl leading-tight font-bold">
                {image.manifestLabel ?? image.label}
              </h2>
              {#if image.imageLabel && image.imageLabel !== image.manifestLabel}
                <p class="mb-1 text-lg leading-tight text-slate-700">
                  {image.imageLabel}
                </p>
              {/if}
              <p class="wrap-break-word">
                <!-- eslint-disable svelte/no-navigation-without-resolve -->
                <a
                  class="font-mono text-blue-700 underline"
                  href={image.originalImageAnnotation}
                >
                  {image.originalImageAnnotation}
                </a>
                <!-- eslint-enable svelte/no-navigation-without-resolve -->
              </p>
              <p class="mt-1 text-slate-600">{image.width} x {image.height}</p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4 bg-slate-100 p-4 lg:grid-cols-2">
            {#each corsModes as corsMode (corsMode)}
              {@const links = getLinks(image, corsMode)}
              <section
                class={[
                  'overflow-hidden rounded-lg border',
                  corsMode === 'cors'
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-amber-300 bg-amber-50'
                ]}
              >
                <header
                  class={[
                    'px-3.5 py-3 text-white',
                    corsMode === 'cors' ? 'bg-emerald-800' : 'bg-amber-800'
                  ]}
                >
                  <h3 class="text-sm leading-none font-bold uppercase">
                    {corsModeLabels[corsMode]}
                  </h3>
                </header>

                <div
                  class={[
                    'border-t p-3.5',
                    corsMode === 'cors'
                      ? 'border-emerald-200'
                      : 'border-amber-200'
                  ]}
                >
                  <h4
                    class="mb-2 text-sm leading-tight font-bold text-slate-800"
                  >
                    Core Resources
                  </h4>
                  <ul class="grid list-none gap-1.5 p-0">
                    <li>
                      <CopyLink
                        href={`${links.imageService2}/info.json`}
                        label="IIIF Image API 2 info"
                      />
                    </li>
                    <li>
                      <CopyLink
                        href={`${links.imageService3}/info.json`}
                        label="IIIF Image API 3 info"
                      />
                    </li>
                    <li>
                      <CopyLink href={links.annotation} label="Annotation" />
                    </li>
                  </ul>
                </div>

                <div
                  class={[
                    'border-t p-3.5',
                    corsMode === 'cors'
                      ? 'border-emerald-200'
                      : 'border-amber-200'
                  ]}
                >
                  <h4
                    class="mb-2 text-sm leading-tight font-bold text-slate-800"
                  >
                    Manifests
                  </h4>
                  {#if links.manifests}
                    <ul class="grid list-none gap-1.5 p-0">
                      <li>
                        <CopyLink
                          href={links.manifests.iiif2}
                          label="IIIF Presentation 2"
                        />
                      </li>
                      <li>
                        <CopyLink
                          href={links.manifests.iiif3}
                          label="IIIF Presentation 3"
                        />
                      </li>
                      {#each links.manifests.variants as variant (variant.href)}
                        <li>
                          <CopyLink href={variant.href} label={variant.label} />
                        </li>
                      {/each}
                    </ul>
                  {:else}
                    <p class="text-sm text-red-900">No manifest fixture</p>
                  {/if}
                </div>

                <div
                  class={[
                    'border-t p-3.5',
                    corsMode === 'cors'
                      ? 'border-emerald-200'
                      : 'border-amber-200'
                  ]}
                >
                  <h4
                    class="mb-2 text-sm leading-tight font-bold text-slate-800"
                  >
                    Image Requests
                  </h4>
                  <ul class="grid list-none gap-1.5 p-0">
                    {#each links.examples as example (example.href)}
                      <li>
                        <CopyLink href={example.href} label={example.label} />
                      </li>
                    {/each}
                  </ul>
                </div>

                <div class="border-t border-red-200 bg-red-50 p-3.5">
                  <h4
                    class="mb-3 text-sm leading-tight font-bold text-slate-800"
                  >
                    Resources With Errors
                  </h4>
                  <div>
                    <h5
                      class="mb-1.5 text-sm leading-tight font-bold text-red-900"
                    >
                      info.json
                    </h5>
                    <ul class="grid list-none gap-1.5 p-0">
                      {#each links.errors.infoJsons as errorLink (errorLink.href)}
                        <li>
                          <CopyLink
                            href={errorLink.href}
                            label={errorLink.label}
                          />
                        </li>
                      {/each}
                    </ul>
                  </div>
                  <div class="mt-3">
                    <h5
                      class="mb-1.5 text-sm leading-tight font-bold text-red-900"
                    >
                      Annotations
                    </h5>
                    <ul class="grid list-none gap-1.5 p-0">
                      {#each links.errors.annotations as errorLink (errorLink.href)}
                        <li>
                          <CopyLink
                            href={errorLink.href}
                            label={errorLink.label}
                          />
                        </li>
                      {/each}
                    </ul>
                  </div>
                  <div class="mt-3">
                    <h5
                      class="mb-1.5 text-sm leading-tight font-bold text-red-900"
                    >
                      Manifests
                    </h5>
                    {#if links.errors.manifests.length > 0}
                      <ul class="grid list-none gap-1.5 p-0">
                        {#each links.errors.manifests as errorLink (errorLink.href)}
                          <li>
                            <CopyLink
                              href={errorLink.href}
                              label={errorLink.label}
                            />
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="text-sm text-red-900">
                        No manifest error fixtures
                      </p>
                    {/if}
                  </div>
                </div>
              </section>
            {/each}
          </div>
        </article>
      {/each}
    {/if}
  </div>
</main>
