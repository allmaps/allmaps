<script lang="ts">
  import { onMount } from 'svelte'
  import { Logo } from '@allmaps/ui'

  import bundledMasks from '$lib/hero/masks.json'
  import { getHeroMaskDelay, heroLayoutEvent } from '$lib/hero/grid.js'
  import { getMaskGridRowName } from '$lib/hero/rows.js'
  import {
    getPartnershipGrid,
    isPartnershipCellCovered
  } from '$lib/hero/partnership.js'

  let width = $state(typeof window === 'undefined' ? 1200 : window.innerWidth)
  let grid = $derived(getPartnershipGrid(width))
  let columns = $derived(grid.columns)
  let rows = $derived(grid.rows)
  let titleColumnRowBbox = $derived(grid.title)
  let subtitleColumnRowBbox = $derived(grid.subtitle)
  let logoRow = $derived(grid.logoRow)
  const warpedResourceMasks = bundledMasks.pages['/iiif-partnership'].masks
  let revealed = $state(false)
  let fadeIn = $state(true)

  const strokeColors = [
    'stroke-blue',
    'stroke-purple',
    'stroke-orange',
    'stroke-red',
    'stroke-pink',
    'stroke-green',
    'stroke-yellow'
  ]

  const bgColors = [
    'bg-blue/10',
    'bg-purple/10',
    'bg-orange/10',
    'bg-red/10',
    'bg-pink/10',
    'bg-green/10',
    'bg-yellow/10'
  ]

  function settleForNavigation() {
    fadeIn = false
    revealed = true
  }

  onMount(() => {
    const printing = new URLSearchParams(window.location.search).has('print')
    fadeIn = !printing && !document.documentElement.dataset.heroNavigation
    revealed = true
    window.addEventListener(heroLayoutEvent, settleForNavigation)
    return () =>
      window.removeEventListener(heroLayoutEvent, settleForNavigation)
  })
</script>

<div
  bind:clientWidth={width}
  style:--columns={columns}
  style:--rows={rows}
  class="isolate grid-cols-[repeat(var(--columns),minmax(0,1fr))] grid-rows-[repeat(var(--rows),minmax(0,1fr))] grid w-full m-0 p-4 gap-2"
  class:revealed
  class:fade-in={fadeIn && revealed}
  data-partnership-mask-grid
>
  {#each Array(rows).keys() as row (row)}
    <div
      class="col-span-full min-h-0 overflow-clip"
      style:grid-row={row + 1}
      style:view-transition-name={getMaskGridRowName(row)}
      aria-hidden="true"
    >
      <div class="grid grid-cols-[repeat(var(--columns),minmax(0,1fr))] gap-2">
        {#each Array(columns).keys() as column (column)}
          {@const index = row * columns + column}
          <div
            class={[
              bgColors[index % bgColors.length],
              'aspect-square rounded-md'
            ]}
            class:invisible={isPartnershipCellCovered(grid, column, row)}
          >
            <svg
              viewBox="0 0 100 100"
              class="mask-outline m-0 block size-full motion-reduce:opacity-100 print:opacity-100"
              class:opacity-0={!revealed}
              style:--mask-delay={`${getHeroMaskDelay(index)}ms`}
              focusable="false"
            >
              <path
                class={[
                  strokeColors[index % strokeColors.length],
                  'stroke-[3px] fill-none'
                ]}
                d={warpedResourceMasks[index]?.path}
              />
            </svg>
          </div>
        {/each}
      </div>
    </div>
  {/each}
  <div
    class="grid-cols-[repeat(var(--columns),minmax(0,1fr))] grid-rows-[repeat(var(--rows),minmax(0,1fr))] z-1 grid [grid-area:1/1/-1/-1] gap-2 [view-transition-name:partnership-copy]"
  >
    <div
      style:grid-column-start={titleColumnRowBbox.columnStart}
      style:grid-column-end={titleColumnRowBbox.columnEnd}
      style:grid-row-start={titleColumnRowBbox.rowStart}
      style:grid-row-end={titleColumnRowBbox.rowEnd}
      class="m-0 overflow-hidden bg-white z-10 min-h-0 min-w-0 max-w-full max-h-full @container px-2 flex flex-col justify-center"
    >
      <h1
        class="m-0 p-0 overflow-hidden min-w-0 max-w-full text-[13.4cqi] font-bold leading-[1.2]"
      >
        Open up your <br /> map collections
      </h1>
    </div>
    <div
      style:grid-column-start={subtitleColumnRowBbox.columnStart}
      style:grid-column-end={subtitleColumnRowBbox.columnEnd}
      style:grid-row-start={subtitleColumnRowBbox.rowStart}
      style:grid-row-end={subtitleColumnRowBbox.rowEnd}
      class="m-0 inline-flex items-center bg-white z-10 max-w-full max-h-full @container px-2"
    >
      <h2
        class={[
          'm-0 font-medium leading-[1.2]',
          columns === 8 ? 'text-[12cqi]' : 'text-[5cqi]'
        ]}
      >
        Announcing the Allmaps - IIIF Partnership
      </h2>
    </div>

    <div
      style:grid-row-start={logoRow}
      class="col-start-2 bg-white z-10 inline-flex items-center justify-center"
    >
      <div class="w-3/5 h-3/5 opacity-80">
        <Logo />
      </div>
    </div>
    <div
      style:grid-row-start={logoRow}
      class="col-start-3 bg-white z-10 inline-flex items-center justify-center"
    >
      <div class="w-3/5 h-3/5 opacity-80">
        <svg
          class="w-full h-full"
          version="1.1"
          x="0px"
          y="0px"
          viewBox="0 0 493.4 441.3"
          xml:space="preserve"
        >
          <g id="g10" transform="matrix(1.3333333,0,0,-1.3333333,0,441.33333)">
            <g id="g12" transform="scale(0.1)">
              <path
                id="path14"
                d="M65.2,2178.8l710-263.8L774,15L65.2,276.3V2178.8"
              />
              <path
                id="path16"
                d="M804.1,2640.1c81.4-240.9-26.5-436.2-241-436.2c-214.6,0-454.5,195.3-536,436.2
			c-81.4,240.9,26.5,436.2,241,436.2C482.8,3076.3,722.7,2881,804.1,2640.1"
              />
              <path
                id="path18"
                d="M1678.6,2178.8l-710-263.8l1.2-1900l708.8,261.3V2178.8"
              />
              <path
                id="path20"
                d="M935.1,2640.1c-81.4-240.9,26.5-436.2,241-436.2c214.6,0,454.5,195.3,536,436.2
			c81.4,240.9-26.5,436.2-241,436.2C1256.5,3076.3,1016.5,2881,935.1,2640.1"
              />
              <path
                id="path22"
                d="M1860.2,2178.8l710-263.8L2569,15l-708.8,261.3V2178.8"
              />
              <path
                id="path24"
                d="M2603.7,2640.1c81.4-240.9-26.5-436.2-241-436.2c-214.6,0-454.5,195.3-536,436.2
			c-81.4,240.9,26.5,436.2,241,436.2C2282.4,3076.3,2522.3,2881,2603.7,2640.1"
              />
              <path
                id="path26"
                d="M3700.2,3310v-652.5c0,0-230,90-257.5-142.5c-2.5-247.5,0-336.2,0-336.2l257.5,83.8V1690l-258.6-92.5v-1335
			L2735.2,0v2360C2735.2,2360,2720.2,3210,3700.2,3310"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>
  </div>
</div>

<style>
  .fade-in .mask-outline {
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

  @media (prefers-reduced-motion: reduce), print {
    .mask-outline {
      animation: none !important;
    }
  }
</style>
