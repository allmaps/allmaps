<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import { orange, blue, pink, purple, green } from '@allmaps/tailwind'
  import {
    PUBLIC_DOCS_BASE_URL,
    PUBLIC_HOMEPAGE_BASE_URL
  } from '$env/static/public'

  import { homepageScreenshots } from '$lib/data/homepage-screenshots.js'
  import { toolIdentities } from '$lib/data/tool-identities.js'
  import {
    getScreenshotImage,
    getExampleImage
  } from '$lib/data/screenshot-images.js'

  import ScreenshotPanel from '$lib/components/ScreenshotPanel.svelte'
  import HomepageTitle from '$lib/components/HomepageTitle.svelte'
  import HomepageFeature from '$lib/components/HomepageFeature.svelte'
  import Footer from '$lib/components/Footer.svelte'
  import LatestMaps from '$lib/components/LatestMaps.svelte'
  import IIIFPartnershipCard from '$lib/components/IIIFPartnershipCard.svelte'
  import HomepageResources from '$lib/components/HomepageResources.svelte'
  import ArrowLabel from '$lib/components/ArrowLabel.svelte'

  const qgisImage =
    'https://files.allmaps.org/images/screenshots/qgis-desktop/v1-1308w.webp'
  const qgisImage480 =
    'https://files.allmaps.org/images/screenshots/qgis-desktop/v1-480w.webp'

  const manhattanImage = getExampleImage('manhattan-aerial-survey')
  const manhattanPhoneImage = getExampleImage('manhattan-aerial-survey-phone')
  // TODO: Fetch a sharper Hollywood source when the library's IIIF service
  // recovers, then generate responsive desktop and phone crops.
  const hollywoodImage =
    'https://files.allmaps.org/images/homepage/examples/hollywood-nirenstein-atlas/v1.jpg'
  const lynnImage = getExampleImage('lynn-city-atlas')
  const lynnPhoneImage = getExampleImage('lynn-city-atlas-phone')
  const rotterdamImage = getExampleImage('rotterdam-city-map')
  const rotterdamPhoneImage = getExampleImage('rotterdam-city-map-phone')

  const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')
  const homepageUrl = new URL('/', PUBLIC_HOMEPAGE_BASE_URL).href
  const title = 'Allmaps: curating, georeferencing and exploring IIIF maps'
  const description = 'Curating, georeferencing and exploring for IIIF maps'
  const ogImageUrl = new URL('/allmaps.jpg', homepageUrl).href
  const ogImageAlt =
    'Allmaps logo on a blue radial gradient with colorful map outlines'
  const screenshotSizes =
    'auto, (min-width: 1168px) 480px, (min-width: 768px) calc((100vw - 208px) / 2), (min-width: 640px) calc(100vw - 96px), calc(100vw - 64px)'

  const examples = [
    {
      image: rotterdamImage.src,
      srcset: rotterdamImage.srcset,
      phoneSrcset: rotterdamPhoneImage.srcset,
      color: blue,
      title: 'Plattegrond van Rotterdam in 10 bladen (1895 - 1897)',
      institution: 'Stadsarchief Rotterdam',
      annotationUrl:
        'https://annotations.allmaps.org/manifests/631b96e4d6d3f421'
    },
    {
      image: lynnImage.src,
      srcset: lynnImage.srcset,
      phoneSrcset: lynnPhoneImage.srcset,
      color: pink,
      title: 'Atlas of the city of Lynn, Massachusetts',
      institution: 'Leventhal Map & Education Center',
      annotationUrl:
        'https://annotations.allmaps.org/manifests/23379602e8187445'
    },
    {
      image: hollywoodImage,
      color: green,
      title: 'Nirenstein Atlas, Hollywood, 1956',
      institution: 'Los Angeles Public Library',
      annotationUrl:
        'https://annotations.allmaps.org/manifests/64d6e35b64564692'
    },
    {
      image: manhattanImage.src,
      srcset: manhattanImage.srcset,
      phoneSrcset: manhattanPhoneImage.srcset,
      color: orange,
      title: 'Aerial survey, Manhattan Island, New York City',
      institution: 'Library of Congress',
      annotationUrl:
        'https://annotations.allmaps.org/manifests/06b7d15dc577b7ee'
    }
  ]
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={homepageUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Allmaps" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:url" content={homepageUrl} />
  <meta property="og:image" content={ogImageUrl} />
  {#if ogImageUrl.startsWith('https:')}
    <meta property="og:image:secure_url" content={ogImageUrl} />
  {/if}
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={ogImageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageUrl} />
  <meta name="twitter:image:alt" content={ogImageAlt} />
</svelte:head>

<HomepageTitle />

<main
  class="prose mt-8 max-w-none bg-white text-[#2a3b41] md:mt-12 prose-headings:text-black prose-a:text-pink prose-li:marker:text-black/60"
>
  <section class="page-width [&>ol]:m-0">
    <ol role="list" class="flex list-none flex-col gap-8 p-0 py-8 md:gap-16">
      <HomepageFeature title="Works with any IIIF map">
        {#snippet description()}
          <p>
            More and more institutions around the world use
            <a href="https://iiif.io/">IIIF</a> to share their digitized collections.
            Among these images are millions of maps.
          </p>
          <p>
            With <a href={toolIdentities.editor.href}
              >{toolIdentities.editor.name}</a
            >, you can georeference any map from an institution that supports
            IIIF. You don’t need complicated GIS infrastructure or to generate
            XYZ map tiles. All you need is a IIIF server.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel color={orange} href={toolIdentities.editor.href}>
            <Screenshot
              class="w-full"
              {...homepageScreenshots.editorIiifMap}
              {...getScreenshotImage(homepageScreenshots.editorIiifMap.slug)}
              sizes={screenshotSizes}
              alt="Allmaps Editor matching locations on a historical map to a modern map"
              showUrl
              urlDisplay="route"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>

      <HomepageFeature title="Built on open standards">
        {#snippet description()}
          <p>
            All components of Allmaps use
            <a href="https://iiif.io/api/extension/georef/"
              >Georeference Annotations</a
            >
            that hold each map's georeference data. Georeference Annotations are based
            on W3C's
            <a href="https://www.w3.org/TR/annotation-model/"
              >Web Annotation standard</a
            >
            and are an
            <a href="https://iiif.io/api/index.html#approved-extensions"
              >approved extension</a
            >
            to the IIIF Presentation API.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel
            color={blue}
            href="https://iiif.io/api/extension/georef/"
          >
            <Screenshot
              class="w-full"
              {...homepageScreenshots.iiifGeoreferenceExtension}
              {...getScreenshotImage(
                homepageScreenshots.iiifGeoreferenceExtension.slug
              )}
              sizes={screenshotSizes}
              alt="The IIIF Georeference Extension specification"
              showUrl
              urlDisplay="route"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>

      <HomepageFeature title="Client-side map warping">
        {#snippet description()}
          <p>
            Allmaps can warp maps on-the-fly, in the browser. Allmaps functions
            without the need to first create image derivatives such as GeoTIFFs
            or map tiles.
          </p>
          <p>
            To warp a map, Allmaps uses the
            <a href="https://iiif.io/api/image/3.0/#4-image-requests"
              >IIIF Image API</a
            >
            to only download the portion of the image that's needed, in the right
            scale.
            <a
              href={`${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F28ed75ea7a785f32`}
              >Allmaps Viewer</a
            >
            can stitch maps that are composed of multiple sheets together in real-time.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel
            color={pink}
            href={`${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F28ed75ea7a785f32`}
          >
            <Screenshot
              class="w-full"
              {...homepageScreenshots.viewerNewYork}
              {...getScreenshotImage(homepageScreenshots.viewerNewYork.slug)}
              sizes={screenshotSizes}
              alt="Allmaps Viewer displaying a historical map of New York City over a modern map"
              showUrl
              urlDisplay="route"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>

      <HomepageFeature title="More than displaying map layers">
        {#snippet description()}
          <p>
            Allmaps is about more than warping images and displaying map
            overlays: it’s about open standards and open data. Georeference
            Annotations let you do much more than display a map.
          </p>
          <p>
            You can build geospatial indexes to quickly find the maps you're
            looking for,
            <a href={`${docsBaseUrl}/guides/annotating-maps-with-annotorious`}
              >turn traced features into GeoJSON</a
            >,
            <a
              href={`${docsBaseUrl}/guides/transforming-coordinates#from-geographic-coordinates-to-image-pixels`}
              >draw GeoJSON on an unwarped map</a
            >
            or automatically georeference maps by
            <a
              href="https://observablehq.com/@allmaps/georeferencing-a-map-by-transcribing-toponyms"
              >geocoding transcribed toponyms</a
            >.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel
            color={purple}
            href={`${docsBaseUrl}/guides/annotating-maps-with-annotorious`}
          >
            <Screenshot
              class="w-full"
              {...homepageScreenshots.annotoriousBuildingOutlines}
              {...getScreenshotImage(
                homepageScreenshots.annotoriousBuildingOutlines.slug
              )}
              sizes={screenshotSizes}
              alt="Building outlines traced with Annotorious on a historical map of Easthampton"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>

      <HomepageFeature title="It's all about the URL">
        {#snippet description()}
          <p>
            Start georeferencing in
            <a href={toolIdentities.editor.href}>{toolIdentities.editor.name}</a
            >
            with the URL of a
            <a
              href="https://iiif.io/api/image/3.0/#22-image-information-request-uri-syntax"
              >IIIF Image</a
            >
            or
            <a href="https://iiif.io/api/presentation/3.0/#52-manifest"
              >Manifest</a
            >. There’s no need to create an account or upload images.
          </p>
          <p>
            Open a Georeference Annotation URL in
            <a href={toolIdentities.viewer.href}>{toolIdentities.viewer.name}</a
            > to display the map. The images stay at their IIIF source, while the
            georeference data describes how to position them.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel
            color={green}
            href={`${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fimages%2F5719a92f4727cdc3`}
          >
            <Screenshot
              class="w-full"
              {...homepageScreenshots.viewerSourceUrl}
              {...getScreenshotImage(homepageScreenshots.viewerSourceUrl.slug)}
              sizes={screenshotSizes}
              alt="An Iceland map in Allmaps Viewer’s image view, with the source-information panel showing its Georeference Annotation URL"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>

      <HomepageFeature title="Entirely open source">
        {#snippet description()}
          <p>
            The whole <a href="https://github.com/allmaps/allmaps"
              >Allmaps project</a
            > is open source: apps, libraries, plugins and APIs. Our goal is to make
            maps from collections big and small easier to find and use.
          </p>
          <p>
            Our plugins for <a href="https://maplibre.org/">MapLibre</a>,
            <a href="https://openlayers.org/">OpenLayers</a> and
            <a href="https://leafletjs.com/">Leaflet</a> make it easy to display georeferenced
            maps on your own website, without using infrastructure provided by Allmaps.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel
            color={orange}
            href="https://github.com/allmaps/allmaps"
          >
            <Screenshot
              class="w-full"
              {...homepageScreenshots.githubRepository}
              {...getScreenshotImage(homepageScreenshots.githubRepository.slug)}
              sizes={screenshotSizes}
              alt="The Allmaps source repository on GitHub in its desktop layout, showing the apps, APIs and packages"
              showUrl
              urlDisplay="route"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>

      <HomepageFeature title="Not just the browser">
        {#snippet description()}
          <p>
            Use georeferenced maps in QGIS and other GIS software. Load an
            <a href={`${docsBaseUrl}/guides/using-maps#xyz-map-tiles`}
              >XYZ tile layer</a
            >
            from Allmaps Tile Server, or use GDAL to create
            <a href={`${docsBaseUrl}/guides/using-maps#geotiff`}>GeoTIFFs</a>
            and
            <a
              href={`${docsBaseUrl}/packages/cli#use-gdal-to-generate-an-xyz-tile-layer-from-a-georeference-annotation`}
              >generate your own map tiles</a
            >.
          </p>
          <p>
            Export
            <a href={`${docsBaseUrl}/guides/using-maps#png-jpeg-and-webp`}
              >PNG, JPEG or WebP images</a
            > for presentations, publications or other applications.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel
            color={blue}
            href={`${docsBaseUrl}/guides/using-maps`}
          >
            <img
              src={qgisImage}
              srcset={`${qgisImage480} 480w, ${qgisImage} 1308w`}
              sizes={screenshotSizes}
              alt="A georeferenced historical map of Asia over OpenStreetMap in QGIS"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>

      <HomepageFeature title="Aerial photos & building plans">
        {#snippet description()}
          <p>
            Allmaps works with any IIIF resource that can be georeferenced,
            including maps in books, newspapers and archives,
            <a
              href={`${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F50942a4e010841aa`}
              >architectural drawings</a
            >
            and
            <a
              href={`${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fimages%2F4bcc9463d2a68df4`}
              >aerial photographs</a
            >.
          </p>
          <p>
            Study the past, present contemporary maps or explore future
            proposals. In
            <a href="https://cityatlas.theberlage.nl/">education contexts</a>,
            Allmaps helps explore a site across different times and scales.
          </p>
        {/snippet}
        {#snippet media()}
          <ScreenshotPanel
            color={pink}
            href={`${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F50942a4e010841aa`}
          >
            <Screenshot
              class="w-full"
              {...homepageScreenshots.viewerDelftAula}
              {...getScreenshotImage(homepageScreenshots.viewerDelftAula.slug)}
              sizes={screenshotSizes}
              alt="The TU Delft Aula floor plan from Delft University of Technology Library displayed over a modern map in Allmaps Viewer"
              showUrl
              urlDisplay="route"
            />
          </ScreenshotPanel>
        {/snippet}
      </HomepageFeature>
    </ol>
  </section>

  <IIIFPartnershipCard />

  <section class="not-prose" aria-labelledby="example-maps-title">
    <ol role="list" class="not-prose m-0 list-none p-0">
      {#each examples as example, index (example.annotationUrl)}
        <li
          class={[
            'grid',
            index % 2 === 0
              ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
              : 'md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
          ]}
        >
          <div
            class={[
              'flex flex-col justify-center gap-8 bg-white px-6 py-10 text-[#121a1c] md:p-12',
              index % 2 === 1 && 'md:order-2'
            ]}
          >
            {#if index === 0}
              <h2 id="example-maps-title" class="section-title m-0">
                Maps georeferenced with Allmaps
              </h2>
            {/if}
            <div
              class="relative space-y-3 before:absolute before:-top-[18px] before:left-0 before:h-1 before:w-11 before:bg-[var(--example-accent)] before:content-['']"
              style:--example-accent={example.color}
            >
              <h3 class="subsection-title m-0">
                <a
                  class="text-inherit underline decoration-black/20 hover:decoration-current"
                  href={`${toolIdentities.viewer.href}/?url=${example.annotationUrl}`}
                >
                  {example.title}
                </a>
              </h3>
              <p class="m-0 text-base leading-relaxed text-[#2a3b41]">
                {example.institution}
              </p>
            </div>
          </div>
          <a
            class="relative block min-h-72 overflow-hidden sm:min-h-96"
            href={`${toolIdentities.viewer.href}/?url=${example.annotationUrl}`}
            aria-label={`View ${example.title} in Allmaps Viewer`}
          >
            <picture>
              {#if example.phoneSrcset}
                <source
                  media="(max-width: 767px)"
                  srcset={example.phoneSrcset}
                  sizes="max(100vw, 384px)"
                />
              {/if}
              <img
                class="absolute inset-0 h-full w-full object-cover"
                src={example.image}
                srcset={example.srcset}
                sizes={example.srcset
                  ? '(min-width: 768px) max(60vw, 684px), max(100vw, 512px)'
                  : undefined}
                alt={example.title}
                loading="lazy"
              />
            </picture>
          </a>
        </li>
      {/each}
    </ol>
  </section>

  <section class="not-prose bg-black py-12 md:py-16 text-white">
    <div class="page-width space-y-8">
      <div class="space-y-4">
        <div
          class="flex flex-col items-baseline justify-between gap-4 lg:flex-row lg:gap-6"
        >
          <h2 class="section-title m-0">Recently georeferenced maps</h2>
          <a
            class="group inline-flex shrink-0 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4"
            href={toolIdentities.latest.href}
          >
            <ArrowLabel light>Explore Allmaps Latest</ArrowLabel>
          </a>
        </div>
        <p class="m-0 text-lg leading-relaxed">
          See what people are georeferencing across collections around the
          world.
        </p>
      </div>
      <LatestMaps />
    </div>
  </section>

  <HomepageResources />
</main>

<Footer />
