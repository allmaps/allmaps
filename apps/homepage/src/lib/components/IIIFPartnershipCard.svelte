<script lang="ts">
  import { PUBLIC_HOMEPAGE_BASE_URL } from '$env/static/public'
  import { getScreenshotImage } from '$lib/data/screenshot-images.js'
  import { Screenshot } from '@allmaps/ui'
  import ScreenshotPanel from '$lib/components/ScreenshotPanel.svelte'
  import { green } from '@allmaps/tailwind'
</script>

<section
  class="page-width mt-8 mb-16 grid items-center gap-6 md:grid-cols-2 md:gap-16 [&_img]:m-0"
  aria-labelledby="iiif-partnership-title"
>
  <div class="md:order-2">
    <h3 id="iiif-partnership-title" class="mt-0">
      Support Allmaps through IIIF
    </h3>
    <p class="mb-0 text-lg leading-relaxed">
      Help sustain the open source tools that bring map collections to life.
      Through the <a href="/iiif-partnership/">IIIF–Allmaps partnership</a>,
      IIIF Consortium members can fund ongoing development and maintenance, with
      dedicated services, training and support in return.
    </p>
  </div>
  <ScreenshotPanel color={green} href="/iiif-partnership/">
    <Screenshot
      {...getScreenshotImage('iiif-partnership')}
      sizes="auto, (min-width: 1168px) 480px, (min-width: 768px) calc((100vw - 208px) / 2), (min-width: 640px) calc(100vw - 96px), calc(100vw - 64px)"
      url={`${PUBLIC_HOMEPAGE_BASE_URL.replace(/\/$/, '')}/iiif-partnership/`}
      slug="iiif-partnership"
      viewport={{ width: 1280, height: 917, deviceScaleFactor: 1 }}
      waitForSelector="[data-partnership-mask-grid].revealed"
      delay={10000}
      alt="The Allmaps–IIIF partnership page, with colorful map masks and the Allmaps and IIIF logos"
      showUrl
      urlDisplay="route"
    />
  </ScreenshotPanel>
</section>
