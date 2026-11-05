<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import { orange, blue, green, pink } from '@allmaps/tailwind'
  import { PUBLIC_DOCS_BASE_URL } from '$env/static/public'
  import ArrowLabel from '$lib/components/ArrowLabel.svelte'
  import { faqGeoreferencingScreenshot } from '$lib/data/faq-screenshots.js'
  import { toolIdentities } from '$lib/data/tool-identities.js'
  import { getScreenshotImage } from '$lib/data/screenshot-images.js'

  const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')
  const screenshotViewport = { width: 1280, height: 720, deviceScaleFactor: 2 }

  const startingPoints = [
    {
      id: 'georeference-a-map',
      title: 'Georeference a map',
      color: orange,
      description:
        'Find a map’s IIIF link, open it in Allmaps Editor, and match locations on the historical map to a modern map. The image stays with the institution that published it.',
      detail:
        'You can start without creating an account. The georeferencing guide takes you through the process step by step.',
      links: [
        {
          label: `Open ${toolIdentities.editor.name}`,
          href: toolIdentities.editor.href
        },
        {
          label: 'Follow the georeferencing guide',
          href: `${docsBaseUrl}/guides/georeferencing-maps`
        }
      ],
      screenshot: {
        ...faqGeoreferencingScreenshot,
        ...getScreenshotImage('get-started-editor-utrecht'),
        slug: 'get-started-editor-utrecht',
        viewport: { width: 720, height: 480, deviceScaleFactor: 2 },
        widths: [320, 480, 640, 720],
        // Enlarge the interface while leaving space around both complete masks.
        steps: faqGeoreferencingScreenshot.steps.map((step) =>
          step.action === 'scroll' ? { ...step, deltaY: 672 } : step
        ),
        alt: 'Allmaps Editor showing matching control points and complete mask outlines on a Utrecht University historical map and a modern map of Utrecht'
      }
    },
    {
      id: 'explore-maps',
      title: 'Explore maps',
      color: blue,
      description:
        'Browse recently georeferenced maps in Allmaps Latest, view a historical map over a modern map in Allmaps Viewer, or discover maps around your current location with Allmaps Here.',
      detail: 'See familiar places through maps from another time.',
      links: [
        { label: toolIdentities.latest.name, href: toolIdentities.latest.href },
        { label: toolIdentities.viewer.name, href: toolIdentities.viewer.href },
        { label: toolIdentities.here.name, href: toolIdentities.here.href }
      ],
      screenshot: {
        ...getScreenshotImage('viewer-warped-map'),
        url: `${toolIdentities.viewer.href}/?url=https://annotations.allmaps.org/images/a7afe9a34c3b8633`,
        slug: 'viewer-warped-map',
        waitForRender: true,
        alt: 'Allmaps Viewer displaying a georeferenced historical map over a modern basemap'
      }
    },
    {
      id: 'build-with-allmaps',
      title: 'Build with Allmaps',
      color: green,
      description:
        'Add historical maps to your website with the MapLibre, OpenLayers or Leaflet plugins. Explore the libraries and APIs, or download open georeference data for your own projects.',
      detail: 'Use the parts you need. The whole project is open source.',
      links: [
        { label: 'Read the docs', href: docsBaseUrl },
        { label: 'Plugins and libraries', href: '/open-source' },
        { label: 'Explore open data', href: '/data' }
      ],
      screenshot: {
        ...getScreenshotImage('allmaps-github'),
        url: 'https://github.com/allmaps',
        slug: 'allmaps-github',
        version: 2,
        alt: 'The Allmaps open source organization on GitHub'
      }
    },
    {
      id: 'new-to-iiif',
      title: 'New to IIIF?',
      color: pink,
      description:
        'IIIF is a set of open standards that libraries, archives and museums use to share digitized images. Look for an IIIF link or logo on a collection’s map page: that link is your starting point in Allmaps Editor.',
      links: [
        {
          label: 'Find maps to georeference',
          href: `${docsBaseUrl}/guides/find-maps-to-georeference`
        },
        { label: 'Learn about IIIF', href: `${docsBaseUrl}/iiif` },
        { label: 'Frequently asked questions', href: '/faq' },
        { label: 'Ask us a question', href: '/contact' }
      ],
      screenshot: {
        ...getScreenshotImage('iiif-homepage'),
        url: 'https://iiif.io/',
        slug: 'iiif-homepage',
        alt: 'The IIIF homepage introducing open standards for sharing digital images, with a globe in the background'
      }
    }
  ]
</script>

<div
  class="breakout-width mt-12 text-base leading-relaxed text-[#121a1c] not-prose"
>
  <div class="grid gap-8">
    {#each startingPoints as point (point.id)}
      <section
        class="group/section grid items-center gap-8 overflow-clip rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,white)] px-6 py-8 sm:px-9 sm:py-9 lg:grid-cols-2 lg:gap-10"
        style:--accent={point.color}
        aria-labelledby={point.id}
      >
        <div class="lg:group-even/section:order-2">
          <h2
            class="section-title mt-0 mb-4 scroll-mt-24 text-(--accent)"
            id={point.id}
          >
            {point.title}
          </h2>
          <p class="mt-0 mb-4">{point.description}</p>
          {#if point.detail}
            <p class="mt-0 mb-4">{point.detail}</p>
          {/if}
          <ul
            class="mt-6 mb-0 grid list-none gap-2.5 p-0 [&_a]:font-bold [&_a]:text-(--accent) [&_a]:no-underline"
          >
            {#each point.links as link (link.href)}
              <li>
                <a
                  class="group inline-block max-w-full rounded-xs focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-(--accent)"
                  href={link.href}
                >
                  <ArrowLabel>{link.label}</ArrowLabel>
                </a>
              </li>
            {/each}
          </ul>
        </div>
        <figure class="m-0 min-w-0">
          <a
            class="screenshot-frame focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-(--accent)"
            href={point.screenshot.url}
          >
            <Screenshot
              viewport={screenshotViewport}
              {...point.screenshot}
              sizes="auto, (min-width: 1168px) 456px, (min-width: 1024px) calc((100vw - 256px) / 2), (min-width: 640px) calc(100vw - 168px), calc(100vw - 112px)"
              showUrl
              urlDisplay="route"
            />
          </a>
        </figure>
      </section>
    {/each}
  </div>
</div>
