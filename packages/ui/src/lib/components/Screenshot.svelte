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
    alt: string
    src?: string
    filesBaseUrl?: string
    loading?: 'lazy' | 'eager'
    class?: string
  }

  let {
    url,
    slug,
    alt,
    version,
    viewport,
    crop,
    steps,
    targets,
    waitForSelector,
    waitForRender,
    delay,
    geometry,
    highlights = [],
    highlight,
    highlightPadding = 4,
    shadow = false,
    src,
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
        viewport,
        crop,
        steps,
        targets,
        waitForSelector,
        waitForRender,
        delay
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
</script>

<div
  class="screenshot {className}"
  class:shadow
  class:cropped={!!screenshot.crop}
>
  {#if !screenshot.crop}
    <div class="toolbar" aria-hidden="true">
      <svg width="40" height="12" viewBox="0 0 40 12">
        <circle cx="6" cy="6" r="5" fill="#ff5f57" />
        <circle cx="20" cy="6" r="5" fill="#febc2e" />
        <circle cx="34" cy="6" r="5" fill="#28c840" />
      </svg>
    </div>
  {/if}
  <div class="image">
    <img
      src={imageUrl}
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
  .screenshot {
    display: block;
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
    padding: 0.3125rem 0.5rem;
    border-bottom: 1px solid var(--screenshot-border, #d4d4d4);
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
