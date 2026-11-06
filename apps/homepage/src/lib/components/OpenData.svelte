<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import { green } from '@allmaps/tailwind'
  import {
    PUBLIC_ANNOTATIONS_BASE_URL,
    PUBLIC_DATA_FILES_BASE_URL,
    PUBLIC_DOCS_BASE_URL
  } from '$env/static/public'
  import DataTable from './DataTable.svelte'
  import MapDataPreview from './MapDataPreview.svelte'
  import { getScreenshotImage } from '$lib/data/screenshot-images.js'

  const linkClass =
    'font-bold text-[color-mix(in_srgb,var(--accent)_65%,#121a1c)] underline underline-offset-3 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-(--accent)'

  const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')
  const annotationsUrl = `${PUBLIC_ANNOTATIONS_BASE_URL.replace(/\/$/, '')}/maps`
</script>

<div
  class="breakout-width mt-12 text-base leading-relaxed text-[#121a1c] grid gap-12 not-prose"
  style:--accent={green}
>
  <section
    class="min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,white)] p-6 lg:p-12"
    aria-labelledby="in-the-data"
  >
    <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <h2
          class="section-title mt-0 mb-4 scroll-mt-24 text-[color-mix(in_srgb,var(--accent)_65%,#121a1c)]"
          id="in-the-data"
        >
          What’s in the data?
        </h2>
        <p class="mt-0 mb-4 max-w-copy">
          Georeference data connects a digitized map to its place in the world.
          The downloads are updated daily and contain the latest version of maps
          with a geographic footprint.
        </p>
        <p class="mt-0 mb-4 max-w-copy">
          Allmaps publishes this data under <a
            class={linkClass}
            href="https://creativecommons.org/public-domain/cc0/">CC0</a
          >, free to copy, adapt and reuse. The original map images stay with
          their publishers and have their own rights and licenses.
        </p>
        <p class="mt-0 mb-4 max-w-copy">
          Georeference Annotations are a standard IIIF format for sharing this
          data. They bring together control points, masks and links to the
          original images.
        </p>
        <a class={linkClass} href={`${docsBaseUrl}/georeference-annotations`}
          >Read about Georeference Annotations →</a
        >
      </div>
      <figure class="m-0 min-w-0">
        <div
          class="aspect-[7/5] overflow-hidden rounded-lg border border-[#bac4c8] bg-white"
        >
          <MapDataPreview class="min-h-0" />
        </div>
      </figure>
    </div>
    <div
      class="grid gap-6 lg:grid-cols-3 lg:gap-8 mt-8 [&>div]:border-t-3 [&>div]:border-(--accent) [&>div]:pt-5"
    >
      <div>
        <h3 class="subsection-title mt-0 mb-3">Control points</h3>
        <p class="mt-0 mb-4">
          Pairs of image pixels and geographic coordinates that describe where
          places on the map are located.
        </p>
      </div>
      <div>
        <h3 class="subsection-title mt-0 mb-3">Masks</h3>
        <p class="mt-0 mb-4">
          SVG outlines in image coordinates. Allmaps uses control points to
          transform them into geographic footprints for GeoJSON.
        </p>
      </div>
      <div>
        <h3 class="subsection-title mt-0 mb-3">Links to IIIF resources</h3>
        <p class="mt-0 mb-4">
          References to the original IIIF images, so tools can load maps
          directly from the institutions that publish them.
        </p>
      </div>
    </div>
    <p
      class="mt-6 mb-0 border-t border-[color-mix(in_srgb,var(--accent)_30%,transparent)] pt-6"
    >
      Making something with Allmaps data? <a class={linkClass} href="/contact"
        >We’d love to hear about it.</a
      >
    </p>
  </section>

  <section class="min-w-0 p-6 lg:px-12 lg:py-4" aria-labelledby="downloads">
    <h2 class="section-title mt-0 mb-4 scroll-mt-24" id="downloads">
      Download the data
    </h2>
    <p class="mt-0 mb-4 max-w-copy">
      Choose the format that fits your project. Start with Georeference
      Annotations for tools that support the IIIF Georeference Extension, or the
      GeoJSON with flat properties for GIS software. All formats are free to
      download and reuse.
    </p>
    <DataTable baseUrl={PUBLIC_DATA_FILES_BASE_URL} />
  </section>

  <section
    class="min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,white)] p-6 lg:p-12"
    aria-labelledby="reuse-the-data"
  >
    <div class="grid items-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
      <div>
        <h2
          class="section-title mt-0 mb-4 scroll-mt-24 text-[color-mix(in_srgb,var(--accent)_65%,#121a1c)]"
          id="reuse-the-data"
        >
          Work with the data
        </h2>
        <p class="mt-0 mb-4">
          Use the Allmaps APIs to retrieve Georeference Annotations, query map
          records and find maps by location. Bring georeference data into your
          own applications without downloading the full dataset.
        </p>
        <a
          class={[linkClass, 'inline-block [&_span]:ml-2']}
          href={`${docsBaseUrl}/apis`}
          >Explore the APIs <span aria-hidden="true">→</span></a
        >
      </div>
      <figure class="m-0 min-w-0 p-3 lg:p-0">
        <div class="relative isolate py-4">
          <a class={[linkClass, 'screenshot-frame']} href={annotationsUrl}>
            <Screenshot
              {...getScreenshotImage('allmaps-annotations-api')}
              sizes="auto, (min-width: 1168px) 489px, (min-width: 1024px) calc((100vw - 192px) * 0.55 - 48px), (min-width: 640px) calc(100vw - 168px), calc(100vw - 136px)"
              url={annotationsUrl}
              slug="allmaps-annotations-api"
              showUrl
              viewport={{ width: 600, height: 400, deviceScaleFactor: 2 }}
              alt="A formatted JSON response from the Allmaps Annotations API in Chrome, showing an AnnotationPage containing Georeference Annotations"
            />
          </a>
        </div>
      </figure>
    </div>
    <div
      class="grid gap-6 lg:grid-cols-3 lg:gap-8 mt-12 border-t border-[color-mix(in_srgb,var(--accent)_30%,transparent)] pt-8"
    >
      <div>
        <h3 class="subsection-title mt-0 mb-3">Use the CLI</h3>
        <p class="mt-0 mb-4">
          Parse annotations, transform coordinates and process IIIF resources
          from your terminal. Combine commands in scripts and repeatable
          workflows.
        </p>
        <a class={linkClass} href={`${docsBaseUrl}/packages/cli`}
          >Get started with the CLI →</a
        >
      </div>
      <div>
        <h3 class="subsection-title mt-0 mb-3">Build with open source tools</h3>
        <p class="mt-0 mb-4">
          Work with annotations and coordinates using TypeScript libraries, or
          display georeferenced maps with plugins for MapLibre, OpenLayers and
          Leaflet.
        </p>
        <a class={linkClass} href="/open-source"
          >Explore the libraries and plugins →</a
        >
      </div>
      <div>
        <h3 class="subsection-title mt-0 mb-3">Follow the guides</h3>
        <p class="mt-0 mb-4">
          Learn how to find maps, work with geographic footprints and use
          georeferenced maps in your own projects.
        </p>
        <a
          class={[linkClass, 'block']}
          href={`${docsBaseUrl}/guides/discover-maps`}>Find maps →</a
        >
        <a
          class={[linkClass, 'mt-2 block']}
          href={`${docsBaseUrl}/guides/using-maps`}>Use georeferenced maps →</a
        >
      </div>
    </div>
  </section>
</div>
