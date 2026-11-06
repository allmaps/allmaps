<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import { orange, pink, green } from '@allmaps/tailwind'
  import { PUBLIC_DOCS_BASE_URL } from '$env/static/public'
  import { CodeBlock } from '@allmaps/ui/code'
  import ArrowLabel from './ArrowLabel.svelte'
  import HomepageResourceCard from './HomepageResourceCard.svelte'
  import MapDataPreview from './MapDataPreview.svelte'
  import MapLibrePreview from './MapLibrePreview.svelte'
  import {
    maplibreAnnotationUrl,
    maplibreExample,
    maplibreFolds,
    transformExample
  } from '$lib/data/homepage-code-examples.js'

  import { toolIdentities } from '$lib/data/tool-identities.js'
  import { getScreenshotImage } from '$lib/data/screenshot-images.js'

  const linkClass =
    'text-inherit no-underline focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-[var(--accent,#003653)]'

  const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')
  const editorImage = getScreenshotImage('get-started-editor-utrecht')
  const tools = [
    {
      ...toolIdentities.editor,
      description: 'Connect a historical map to its place in the world.',
      action: 'Georeference a map',
      captureUrl: `${toolIdentities.editor.href}/`,
      slug: 'homepage-tools-editor',
      image: editorImage.src,
      srcset: editorImage.srcset,
      alt: 'Allmaps Editor showing matching control points and complete mask outlines on a Utrecht University historical map and a modern map of Utrecht',
      color: orange
    },
    {
      ...toolIdentities.viewer,
      description: 'Explore georeferenced maps and compare past and present.',
      action: 'Explore a map',
      slug: 'tools-viewer-liber-floridus',
      captureUrl: `${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fimages%2F9d77cf5c62742b6a`,
      image: getScreenshotImage('tools-viewer-liber-floridus').src,
      srcset: getScreenshotImage('tools-viewer-liber-floridus').srcset,
      alt: 'A map of Europe from Liber Floridus warped over a modern map in Allmaps Viewer',
      color: pink
    },
    {
      ...toolIdentities.here,
      description: 'Find maps around you, across libraries and archives.',
      action: 'Find maps nearby',
      captureUrl: `${toolIdentities.here.href}/`,
      slug: 'homepage-tools-here',
      image: getScreenshotImage('allmaps-here-data').src,
      srcset: getScreenshotImage('allmaps-here-data').srcset,
      alt: 'Allmaps Here showing the same location on three historical maps of Delft',
      color: green
    }
  ]
</script>

<div class="text-base leading-relaxed text-[#121a1c] not-prose">
  <section class="py-12 md:py-16 page-width" aria-labelledby="use-allmaps">
    <div
      class="flex flex-col items-baseline justify-between gap-4 lg:flex-row lg:gap-6 mb-8 [&>div>p]:text-lg"
    >
      <div>
        <h2 class="section-title mt-0 mb-3 scroll-mt-24" id="use-allmaps">
          Georeference, explore, discover
        </h2>
        <p class="text-[#46565c]">
          Put historical maps in place, compare past and present, and find maps
          around you.
        </p>
      </div>
      <a
        class={[linkClass, 'group inline-flex shrink-0 font-bold']}
        href="/tools"
      >
        <ArrowLabel>Explore all tools</ArrowLabel>
      </a>
    </div>

    <ul class="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
      {#each tools as tool (tool.name)}
        <li style:--accent={tool.color}>
          <a class={[linkClass, 'flex h-full flex-col group']} href={tool.href}>
            <div
              class="screenshot-frame [&_img]:aspect-3/2 [&_img]:object-cover [&_img]:object-top"
            >
              <Screenshot
                url={tool.captureUrl ?? tool.href}
                slug={tool.slug}
                src={tool.image}
                srcset={tool.srcset}
                sizes="(min-width: 1168px) 310px, (min-width: 768px) calc((100vw - 240px) / 3), (min-width: 640px) calc(100vw - 96px), calc(100vw - 64px)"
                alt={tool.alt}
                loading="lazy"
                showUrl
                urlDisplay="hostname"
              />
            </div>
            <div
              class="flex flex-1 flex-col items-start gap-3 pt-4 md:pt-6 [&_p]:flex-1 md:[&_p]:max-w-76"
            >
              <h3 class="subsection-title m-0">{tool.name}</h3>
              <p class="text-[#46565c]">{tool.description}</p>
              <ArrowLabel class="mt-1 font-bold">{tool.action}</ArrowLabel>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <section
    class="border-t border-[#121a1c]/5 bg-[#f6f8f7] py-12 md:py-16"
    aria-labelledby="open-data-and-source"
  >
    <div class="page-width">
      <div
        class="flex flex-col items-baseline justify-between gap-4 lg:flex-row lg:gap-6 mb-8 [&>div>p]:text-lg"
      >
        <div>
          <h2
            class="section-title mt-0 mb-3 scroll-mt-24"
            id="open-data-and-source"
          >
            Open source &amp; open data
          </h2>
          <p class="text-[#46565c]">
            Bring historical maps into your own projects.
          </p>
        </div>
        <a
          class={[linkClass, 'group inline-flex shrink-0 font-bold']}
          href="/open-source"
        >
          <ArrowLabel>Explore the open source project</ArrowLabel>
        </a>
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <HomepageResourceCard
          class="lg:row-span-2"
          title="Historical maps on your website"
          href={`${docsBaseUrl}/packages/maplibre`}
          action="Use the MapLibre plugin"
        >
          {#snippet description()}
            Display georeferenced maps with MapLibre,
            <a
              class="text-inherit underline decoration-[#121a1c]/20 underline-offset-3 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`${docsBaseUrl}/packages/leaflet`}>Leaflet</a
            >
            or
            <a
              class="text-inherit underline decoration-[#121a1c]/20 underline-offset-3 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`${docsBaseUrl}/packages/openlayers`}>OpenLayers</a
            >.
          {/snippet}
          <div class="flex h-full flex-col">
            <CodeBlock
              code={maplibreExample.javascript}
              language="javascript"
              folds={maplibreFolds}
            />
            <MapLibrePreview annotationUrl={maplibreAnnotationUrl} />
          </div>
        </HomepageResourceCard>

        <HomepageResourceCard
          title="From pixels to coordinates"
          href={`${docsBaseUrl}/packages/transform`}
          action="Use the transform module"
        >
          {#snippet description()}
            Transform points and shapes using a map’s control points.
          {/snippet}
          <CodeBlock code={transformExample} language="javascript" />
        </HomepageResourceCard>

        <HomepageResourceCard
          title="Download the georeference data"
          href="/data"
          action="Explore the dataset"
        >
          {#snippet description()}
            Find maps by place and reuse their georeference data.
          {/snippet}
          <MapDataPreview />
        </HomepageResourceCard>
      </div>
    </div>
  </section>
</div>
