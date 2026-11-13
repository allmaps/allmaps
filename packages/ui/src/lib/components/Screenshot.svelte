<script lang="ts">
  import {
    defineScreenshot,
    screenshotKey,
    screenshotUrl,
    screenshotHighlights,
    screenshotImageSize
  } from '../screenshots.js'
  import {
    registerScreenshot,
    screenshotImageUrl
  } from '@allmaps/ui/screenshots/integration'

  import type { Snippet } from 'svelte'
  import type {
    ScreenshotOptions,
    ScreenshotGeometry,
    ScreenshotBounds
  } from '../screenshots.js'

  type Props = ScreenshotOptions & {
    geometry?: ScreenshotGeometry
    highlights?: string[]
    highlight?: Snippet<[{ name: string; bounds: ScreenshotBounds }]>
    highlightPadding?: number
    shadow?: boolean
    /** Show an inert URL bar beside the browser controls. */
    showUrl?: boolean
    /** Route shows the host and pathname, without query parameters or a hash. */
    urlDisplay?: 'full' | 'hostname' | 'route'
    alt: string
    src?: string
    /** Explicit candidates for a custom src; otherwise generated from widths. */
    srcset?: string
    /** Rendered image width; defaults to auto for lazy images, with 100vw fallback. */
    sizes?: string
    filesBaseUrl?: string
    loading?: 'lazy' | 'eager'
    class?: string
  }

  let {
    url,
    slug,
    alt,
    version,
    displayWidth,
    aspectRatio,
    viewport,
    crop,
    steps,
    targets,
    waitForSelector,
    waitForRender,
    delay,
    widths,
    geometry,
    highlights = [],
    highlight,
    highlightPadding = 4,
    shadow = false,
    showUrl = false,
    urlDisplay = 'full',
    src,
    srcset,
    sizes,
    filesBaseUrl,
    loading = 'lazy',
    class: className = ''
  }: Props = $props()

  const screenshot = $derived(
    registerScreenshot(
      defineScreenshot({
        url,
        slug,
        version,
        displayWidth,
        aspectRatio,
        viewport,
        crop,
        steps,
        targets,
        waitForSelector,
        waitForRender,
        delay,
        widths
      })
    )
  )
  const imageSize = $derived(screenshotImageSize(screenshot, geometry))
  const outlines = $derived(
    screenshotHighlights(screenshot, geometry, highlights)
  )
  const padding = $derived.by(() => {
    if (!Number.isFinite(highlightPadding) || highlightPadding < 0) {
      throw new Error(
        'Screenshot highlightPadding must be a nonnegative number'
      )
    }
    return highlightPadding
  })
  const imageUrl = $derived(
    src ??
      screenshotImageUrl(
        screenshotKey(screenshot),
        screenshotUrl(screenshot, filesBaseUrl)
      )
  )
  const displayedUrl = $derived.by(() => {
    const pageUrl = new URL(screenshot.url)
    switch (urlDisplay) {
      case 'hostname':
        return pageUrl.hostname
      case 'route':
        return `${pageUrl.host}${pageUrl.pathname}`
      default:
        return screenshot.url
    }
  })
  const imageSrcset = $derived(
    srcset ??
      (src !== undefined
        ? undefined
        : screenshot.widths
            ?.map(
              (width) =>
                `${screenshotImageUrl(
                  screenshotKey(screenshot, width),
                  screenshotUrl(screenshot, filesBaseUrl, width)
                )} ${width}w`
            )
            .join(', '))
  )
  const imageSizes = $derived(
    imageSrcset
      ? (sizes ?? (loading === 'lazy' ? 'auto, 100vw' : '100vw'))
      : undefined
  )
</script>

<div
  class="screenshot {className}"
  class:shadow
  class:cropped={!!screenshot.crop}
>
  {#if !screenshot.crop}
    <div class="toolbar" aria-hidden="true" inert>
      <svg width="40" height="12" viewBox="0 0 40 12">
        <circle cx="6" cy="6" r="5" fill="#ff5f57" />
        <circle cx="20" cy="6" r="5" fill="#febc2e" />
        <circle cx="34" cy="6" r="5" fill="#28c840" />
      </svg>
      {#if showUrl}
        <div class="url-bar">{displayedUrl}</div>
      {/if}
    </div>
  {/if}
  <div class="image">
    <img
      src={imageUrl}
      srcset={imageSrcset}
      sizes={imageSizes}
      {alt}
      width={imageSize?.width}
      height={imageSize?.height}
      {loading}
      decoding="async"
    />
    {#if outlines.length && imageSize}
      <svg
        class="highlights"
        viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
        aria-hidden="true"
        focusable="false"
      >
        {#each outlines as { name, bounds } (name)}
          {#if highlight}
            {@render highlight({ name, bounds })}
          {:else}
            <rect
              data-highlight={name}
              x={bounds.x - padding}
              y={bounds.y - padding}
              width={bounds.width + padding * 2}
              height={bounds.height + padding * 2}
              rx="6"
              vector-effect="non-scaling-stroke"
              class="default-highlight"
            />
          {/if}
        {/each}
      </svg>
    {/if}
  </div>
</div>

<style>
  /* Remove the ancestor decoration; descendants cannot cancel its underline. */
  :global(a:has(.screenshot)) {
    text-decoration: none !important;
  }

  .screenshot {
    display: block;
    min-width: 0;
    overflow: visible;
    border: 1px solid var(--screenshot-border, #d4d4d4);
    border-radius: 0.625rem;
    background: var(--screenshot-background, #fafafa);
    color: var(--screenshot-color, #737373);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.06);
  }

  .shadow {
    box-shadow: var(
      --screenshot-shadow,
      0 18px 48px rgb(0 0 0 / 0.22),
      0 4px 12px rgb(0 0 0 / 0.12)
    );
  }

  .cropped {
    border: 0;
  }

  .cropped img {
    border-radius: 0.625rem;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.3125rem 0.5rem;
    border-bottom: 1px solid var(--screenshot-border, #d4d4d4);
  }

  .toolbar svg {
    flex-shrink: 0;
  }

  .url-bar {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
    height: 1.5rem;
    padding: 0 0.5rem;
    border: 1px solid var(--screenshot-url-border, #e5e5e5);
    border-radius: 0.3125rem;
    background: var(--screenshot-url-background, #fff);
    font-size: 0.75rem;
    line-height: 1.375rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .image {
    position: relative;
  }

  .highlights {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  .default-highlight {
    fill: none;
    stroke: var(--screenshot-highlight-color, #ff1493);
    stroke-width: var(--screenshot-highlight-width, 3px);
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    margin: 0;
    border-radius: 0 0 calc(0.625rem - 1px) calc(0.625rem - 1px);
  }
</style>
