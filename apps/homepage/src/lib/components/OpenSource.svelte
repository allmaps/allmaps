<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import { CodeBlock } from '@allmaps/ui/code'
  import { blue, orange, purple, green } from '@allmaps/tailwind'
  import { PUBLIC_DOCS_BASE_URL } from '$env/static/public'
  import PluginPreview from './PluginPreview.svelte'
  import { getScreenshotImage } from '$lib/data/screenshot-images.js'
  import { transformExample } from '$lib/data/homepage-code-examples.js'
  import {
    createMaplibreExample,
    holyokeAnnotationUrl
  } from '$lib/data/plugin-code-examples.js'

  const pluginExample = createMaplibreExample(holyokeAnnotationUrl)

  const linkClass =
    'font-bold text-(--accent) underline underline-offset-3 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-(--accent)'

  const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')
  const libraries = [
    {
      name: 'annotation',
      description: 'Read and create Georeference Annotations.'
    },
    {
      name: 'transform',
      description:
        'Transform image pixels into geographic coordinates and back.'
    },
    {
      name: 'project',
      description: 'Transform coordinates using map projections.'
    },
    {
      name: 'render',
      description: 'Render georeferenced maps in the browser or on a server.'
    }
  ]
</script>

<div
  class="breakout-width mt-12 text-base leading-relaxed text-[#121a1c] grid gap-8 not-prose [&_h2]:text-(--accent) [&_h3]:text-(--accent) [&_.code-block]:scheme-light!"
>
  <section
    class="min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,white)] p-6 lg:p-12"
    style:--accent={blue}
    aria-labelledby="plugins"
  >
    <div class="mb-6 grid items-end gap-6 lg:grid-cols-2">
      <div>
        <h2 class="section-title mt-0 mb-4 scroll-mt-24" id="plugins">
          Put historical maps on your website
        </h2>
        <p class="mt-0 mb-4">
          Add georeferenced maps to MapLibre, OpenLayers or Leaflet. Each plugin
          loads Georeference Annotations and warps the original IIIF images in
          the browser.
        </p>
      </div>
      <div class="mb-4 border-l-2 border-(--accent) pl-5">
        <p class="mt-0 mb-3">
          Try it below: pan, zoom and change the opacity to compare the
          historical map with today’s streets.
        </p>
        <p class="m-0 text-sm text-[#505b5e]">
          Built with the Allmaps MapLibre plugin. Richards standard atlas of
          Holyoke, 1911: <a
            class={linkClass}
            href="https://ark.digitalcommonwealth.org/ark:/50959/rv045p09h"
            >Norman B. Leventhal Map &amp; Education Center at the Boston Public
            Library</a
          >, via Digital Commonwealth.
        </p>
      </div>
    </div>
    <div class="grid items-start gap-6 lg:grid-cols-2">
      <div
        class="min-w-0 [--allmaps-code-border-color:#bac4c8] [--allmaps-code-border-radius:0.5rem] [--allmaps-code-font-size:0.875rem] [--allmaps-code-line-height:1.6] [--allmaps-code-padding-inline:1.25rem] [&_.code-block]:scheme-light!"
      >
        <CodeBlock
          code={pluginExample.javascript}
          language="javascript"
          folds={pluginExample.folds}
        />
      </div>
      <div class="min-w-0">
        <PluginPreview />
      </div>
    </div>
    <a
      class={[
        linkClass,
        'mt-6 inline-block [&_span]:ml-2 [&_span]:inline-block'
      ]}
      href={`${docsBaseUrl}/guides/viewing-maps#try-the-plugins`}
      >Explore the plugins and code examples <span aria-hidden="true">→</span
      ></a
    >
  </section>

  <section
    class="min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,white)] p-6 lg:p-12 grid items-center gap-6 lg:grid-cols-2 lg:gap-16"
    style:--accent={orange}
    aria-labelledby="libraries"
  >
    <div>
      <h2 class="section-title mt-0 mb-4 scroll-mt-24" id="libraries">
        Build with the individual parts
      </h2>
      <p class="mt-0 mb-4">
        Use Allmaps’ TypeScript libraries in your own projects. Work with
        annotations, transform coordinates or render maps.
      </p>
      <ul
        class="my-6 list-none p-0 [&_li]:border-t [&_li]:border-[color-mix(in_srgb,var(--accent)_20%,transparent)] [&_li]:py-2.5 [&_p]:mt-1 [&_p]:mb-0"
      >
        {#each libraries as library (library.name)}
          <li>
            <a
              class={linkClass}
              href={`${docsBaseUrl}/packages/${library.name}`}
              ><code class="font-mono text-[0.875em]"
                >@allmaps/{library.name}</code
              ></a
            >
            <p class="mt-0 mb-4">{library.description}</p>
          </li>
        {/each}
      </ul>
      <a
        class={[linkClass, 'inline-block [&_span]:ml-2 [&_span]:inline-block']}
        href={`${docsBaseUrl}/packages`}
        >Browse all libraries <span aria-hidden="true">→</span></a
      >
    </div>
    <figure class="m-0 min-w-0 p-3 lg:p-0 p-0! [&_figcaption]:mt-4">
      <div
        class="[--allmaps-code-border-color:color-mix(in_srgb,var(--accent)_35%,white)] [--allmaps-code-border-radius:0.5rem] [--allmaps-code-font:var(--font-mono)] [--allmaps-code-font-size:0.8125rem] [--allmaps-code-line-height:1.7] [--allmaps-code-padding-block:1.25rem] [--allmaps-code-padding-inline:1.25rem] [--allmaps-code-focus:var(--accent)]"
      >
        <CodeBlock
          code={transformExample}
          language="javascript"
          title="From pixels to geographic coordinates"
          wrap={false}
        />
      </div>
      <figcaption class="mt-8 text-sm text-[#505b5e]">
        These example control points connect image pixels (x, y) to longitude
        and latitude. Use your map’s control points to transform your own
        coordinates. <a
          class={linkClass}
          href={`${docsBaseUrl}/guides/transforming-coordinates#from-pixels-to-geographic-coordinates`}
          >Learn how to transform coordinates →</a
        >
      </figcaption>
    </figure>
  </section>

  <section
    class="min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,white)] p-6 lg:p-12"
    style:--accent={purple}
    aria-labelledby="apis-and-cli"
  >
    <h2 class="section-title mt-0 mb-4 scroll-mt-24" id="apis-and-cli">
      Connect your tools and workflows
    </h2>
    <div class="grid gap-6 lg:grid-cols-2 lg:gap-12 [&_h3]:mt-2">
      <div>
        <h3 class="subsection-title mt-8 mb-3 scroll-mt-24" id="api">
          Allmaps APIs
        </h3>
        <p class="mt-0 mb-4">
          Retrieve Georeference Annotations, query maps and connect Allmaps to
          your collection systems. The API documentation explains the available
          endpoints and authentication.
        </p>
        <a
          class={[
            linkClass,
            'inline-block [&_span]:ml-2 [&_span]:inline-block'
          ]}
          href={`${docsBaseUrl}/apis`}
          >Explore the APIs <span aria-hidden="true">→</span></a
        >
      </div>
      <div>
        <h3 class="subsection-title mt-8 mb-3 scroll-mt-24" id="cli">
          Allmaps CLI
        </h3>
        <p class="mt-0 mb-4">
          Work with maps from your terminal. Parse annotations, transform
          coordinates and process IIIF resources in scripts and repeatable
          workflows.
        </p>
        <a
          class={[
            linkClass,
            'inline-block [&_span]:ml-2 [&_span]:inline-block'
          ]}
          href={`${docsBaseUrl}/packages/cli`}
          >Get started with Allmaps CLI <span aria-hidden="true">→</span></a
        >
      </div>
    </div>
    <p
      class="mt-8 mb-0 border-t border-[color-mix(in_srgb,var(--accent)_30%,transparent)] pt-6"
    >
      Need data for your project? <a class={linkClass} href="/data"
        >Download the open georeference dataset</a
      > to explore and reuse maps across collections.
    </p>
  </section>

  <section
    class="min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,white)] p-6 lg:p-12 grid items-center gap-6 lg:grid-cols-2 lg:gap-16"
    style:--accent={green}
    aria-labelledby="source-code"
  >
    <div>
      <h2 class="section-title mt-0 mb-4 scroll-mt-24" id="source-code">
        Explore the source code
      </h2>
      <p class="mt-0 mb-4">
        The whole Allmaps project is open source. You can read the code, adapt
        it to your needs and contribute improvements.
      </p>
      <h3 class="subsection-title mt-8 mb-3 scroll-mt-24" id="licenses">
        Licenses
      </h3>
      <p class="mt-0 mb-4">
        The core libraries and mapping plugins use the MIT license. Applications
        and services have their own licenses, listed in each component’s
        repository. Public georeference data is released under CC0.
      </p>
      <p class="mt-0 mb-4">
        Use of the hosted Allmaps services is covered by the <a
          class={linkClass}
          href="/terms">Terms &amp; Usage</a
        >.
      </p>
      <h3 class="subsection-title mt-8 mb-3 scroll-mt-24" id="contribute">
        Help improve Allmaps
      </h3>
      <p class="mt-0 mb-4">
        Report a bug, suggest an improvement, contribute code or help with the
        documentation. You can join the discussion on GitHub or <a
          class={linkClass}
          href="/contact">get in touch</a
        >.
      </p>
      <a
        class={[linkClass, 'inline-block [&_span]:ml-2 [&_span]:inline-block']}
        href="https://github.com/allmaps/allmaps"
        >Explore the code on GitHub <span aria-hidden="true">→</span></a
      >
    </div>
    <figure class="m-0 min-w-0">
      <a
        class={[linkClass, 'screenshot-frame']}
        href="https://github.com/allmaps"
      >
        <Screenshot
          {...getScreenshotImage('allmaps-github')}
          sizes="auto, (min-width: 1168px) 432px, (min-width: 1024px) calc((100vw - 304px) / 2), (min-width: 640px) calc(100vw - 144px), calc(100vw - 112px)"
          url="https://github.com/allmaps"
          slug="allmaps-github"
          version={2}
          viewport={{ width: 1280, height: 720, deviceScaleFactor: 2 }}
          widths={[320, 480, 640, 960, 1280, 1920]}
          alt="The Allmaps open source organization on GitHub"
          showUrl
          urlDisplay="route"
        />
      </a>
    </figure>
  </section>
</div>
