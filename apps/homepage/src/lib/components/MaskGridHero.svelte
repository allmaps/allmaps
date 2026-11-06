<script lang="ts">
  import { onMount } from 'svelte'
  import {
    blue,
    darkblue,
    purple,
    orange,
    red,
    pink,
    green,
    yellow
  } from '@allmaps/tailwind'

  import bundledMasks from '$lib/hero/masks.json'
  import { getMaskGridRowName } from '$lib/hero/rows.js'
  import {
    getHeroGrid,
    getHeroMaskDelay,
    getTitleOpening,
    heroColumns,
    heroLeadingColumns,
    heroLayoutEvent,
    isCellInOpening
  } from '$lib/hero/grid.js'
  import type { GridOpening } from '$lib/hero/grid.js'
  import type { ContentPageHero } from '$lib/content/pages.js'

  let {
    title,
    palette = 'blue',
    pathname
  }: ContentPageHero & { pathname: string } = $props()

  const pageMasks: Record<string, { masks: { id: string; path: string }[] }> =
    bundledMasks.pages
  let masks = $derived(pageMasks[pathname.replace(/\/$/, '')]?.masks ?? [])

  let hero: HTMLElement
  let heading = $state<HTMLHeadingElement>()
  let opening = $state<GridOpening>()
  let mounted = $state(false)
  let revealed = $state(false)
  let fadeIn = $state(true)

  const colors = { blue, darkblue, purple, orange, red, pink, green, yellow }
  const rowNames = Array.from({ length: 3 }, (_, row) =>
    getMaskGridRowName(row)
  )
  let paletteColors = $derived(
    palette === 'all'
      ? [blue, purple, orange, red, pink, green, yellow]
      : [colors[palette]]
  )

  function measure() {
    if (!heading) return
    const heroBounds = hero.getBoundingClientRect()
    const titleBounds = heading.getBoundingClientRect()
    const titleRectangle = {
      left: titleBounds.left - heroBounds.left,
      right: titleBounds.right - heroBounds.left,
      top: titleBounds.top - heroBounds.top,
      bottom: titleBounds.bottom - heroBounds.top
    }
    opening = getTitleOpening(
      getHeroGrid(heroBounds.width, titleRectangle.left),
      titleRectangle
    )
  }

  function settleForNavigation() {
    measure()
    // Capture the destination with complete masks, without replaying load fades.
    fadeIn = false
    revealed = true
  }

  onMount(() => {
    mounted = true
    fadeIn = !document.documentElement.dataset.heroNavigation
    const observer = new ResizeObserver(measure)
    observer.observe(hero)
    if (heading) observer.observe(heading)
    measure()
    void document.fonts.ready.then(() => {
      if (mounted) {
        measure()
        revealed = true
      }
    })
    document.fonts.addEventListener('loadingdone', measure)
    window.addEventListener(heroLayoutEvent, settleForNavigation)
    return () => {
      mounted = false
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', measure)
      window.removeEventListener(heroLayoutEvent, settleForNavigation)
    }
  })

  $effect(() => {
    if (mounted && heading?.textContent === title) measure()
  })
</script>

<header
  bind:this={hero}
  class="mask-grid-hero relative isolate mx-auto w-full max-w-[1600px] overflow-clip bg-white"
  class:measured={Boolean(opening)}
  class:revealed
  class:fade-in={fadeIn && revealed}
  data-mask-grid-hero
>
  {#each rowNames as rowName, row (rowName)}
    <div
      class="hero-row absolute h-(--tile-size) w-full overflow-clip"
      style:--row={row}
      style:view-transition-name={rowName}
    >
      <div class="mask-strip absolute flex gap-2" aria-hidden="true">
        {#each Array(heroColumns).keys() as column (column)}
          {@const index = row * (heroColumns - heroLeadingColumns) + column}
          {@const color = paletteColors[index % paletteColors.length]}
          <div
            class="size-(--tile-size) shrink-0 basis-(--tile-size) rounded-md bg-[color-mix(in_srgb,currentColor_10%,white)]"
            class:invisible={isCellInOpening(column, row, opening)}
            style:color
          >
            <svg
              class="block size-full"
              class:opacity-0={!revealed}
              viewBox="0 0 100 100"
              focusable="false"
              style:--mask-delay={`${getHeroMaskDelay(index)}ms`}
            >
              <path
                class="fill-none stroke-current [stroke-width:3]"
                d={masks[index % masks.length]?.path}
              />
            </svg>
          </div>
        {/each}
      </div>
      {#if row === 1}
        <h1
          class={[
            'absolute top-1/2 left-(--copy-left) m-0 w-max -translate-y-1/2 text-[clamp(32px,4vw,58px)] leading-[1.1] font-bold whitespace-nowrap text-[#121a1c]',
            opening
              ? 'bg-transparent shadow-none'
              : 'bg-white shadow-[0_0_0_16px_white]'
          ]}
          bind:this={heading}
        >
          {title}
        </h1>
      {/if}
    </div>
  {/each}
</header>

<style>
  .mask-grid-hero {
    --tile-size: 80px;
    --pitch: calc(var(--tile-size) + 8px);
    --copy-left: max(
      var(--page-gutter),
      calc((100% - var(--container-copy)) / 2)
    );

    height: calc(3 * var(--tile-size) + 48px);
  }

  .hero-row {
    top: calc(16px + var(--row) * var(--pitch));
  }

  .mask-strip {
    left: calc(var(--copy-left) - 16px - 10 * var(--pitch));
  }

  .fade-in svg {
    animation: mask-fade-in 400ms linear var(--mask-delay) both;
  }

  @keyframes mask-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (width < 640px) {
    .mask-grid-hero {
      --tile-size: 52px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fade-in svg {
      animation: none;
    }
  }
</style>
