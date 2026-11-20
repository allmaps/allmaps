<script module lang="ts">
  // A dotted square draws one ring of grid points with a single SVG path.
  const extent = 32
  const rings = Array.from({ length: extent }, (_, index) => {
    const radius = index + 1
    const side = radius * 2
    return {
      radius,
      path: `M${-radius} ${-radius}h${side}v${side}h${-side}z`,
      strokeWidth: radius / 64,
      even: radius % 2 === 0
    }
  })
  const existingRings = rings.filter((ring) => ring.even)
</script>

<div
  aria-hidden="true"
  class="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
>
  <div
    class="size-full animate-grid-reveal mask-x-from-90% mask-y-from-90% motion-reduce:hidden"
  >
    <svg
      viewBox={`${-extent} ${-extent} ${2 * extent} ${2 * extent}`}
      preserveAspectRatio="xMidYMid slice"
      class="size-full animate-grid-flight fill-none stroke-pink/55"
      stroke-linecap="round"
    >
      <g stroke-dasharray="0 2">
        {#each existingRings as ring (ring.radius)}
          <path d={ring.path} stroke-width={ring.strokeWidth} />
        {/each}
      </g>
      <g class="animate-grid-appear">
        {#each rings as ring (ring.radius)}
          <!-- On existing rings, place new dots halfway between the old ones. -->
          <path
            d={ring.path}
            stroke-width={ring.strokeWidth}
            stroke-dasharray={ring.even ? '0 2' : '0 1'}
            stroke-dashoffset={ring.even ? 1 : 0}
          />
        {/each}
      </g>
    </svg>
  </div>
  <div
    class="hidden size-full bg-radial-[circle_at_center] from-pink/30 from-[2px] to-transparent to-[2.5px] bg-size-[20px_20px] bg-center motion-reduce:block"
  ></div>
</div>
