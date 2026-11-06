<script lang="ts">
  import { blue, green, orange, pink } from '@allmaps/tailwind'
  import preview from '$lib/data/map-data-preview.json'

  let {
    class: className = 'min-h-80'
  }: {
    class?: string
  } = $props()

  const id = $props.id()
  const colors = [blue, pink, orange, blue, green, pink, green, orange, pink]
</script>

<div class={['relative h-full overflow-hidden', className]}>
  <svg
    class="absolute inset-0 size-full text-[#46565c]"
    viewBox={`42 0 ${preview.width * 0.8} ${preview.height * 0.8}`}
    preserveAspectRatio="xMidYMid slice"
    role="img"
    aria-labelledby={`${id}-title`}
  >
    <title id={`${id}-title`}>
      Geographic footprints and control points from {preview.label}, with
      neighboring maps continuing past the edges.
    </title>
    <defs>
      <pattern
        id={`${id}-grid`}
        width="28"
        height="28"
        patternUnits="userSpaceOnUse"
      >
        <path d="M28 0H0V28" fill="none" stroke="currentColor" opacity="0.08" />
      </pattern>
      <clipPath id={`${id}-crop`}>
        <rect width={preview.width} height={preview.height} />
      </clipPath>
    </defs>
    <rect
      width={preview.width}
      height={preview.height}
      fill={`url(#${id}-grid)`}
    />
    <g clip-path={`url(#${id}-crop)`}>
      {#each preview.sheets as sheet, index (sheet.annotationUrl)}
        <g
          class="text-(--sheet-color)"
          style:--sheet-color={colors[index % colors.length]}
          data-annotation-url={sheet.annotationUrl}
        >
          <path
            class="fill-(--sheet-color) stroke-current [fill-opacity:0.18] [stroke-width:2] [stroke-linejoin:round]"
            d={sheet.path}
            vector-effect="non-scaling-stroke"
          />
        </g>
      {/each}
      {#each preview.sheets as sheet, index (sheet.annotationUrl)}
        <g
          class="text-(--sheet-color)"
          style:--sheet-color={colors[index % colors.length]}
        >
          {#each sheet.controlPoints as [x, y], controlPointIndex (controlPointIndex)}
            <circle
              class="fill-current stroke-white [stroke-width:1.25]"
              cx={x}
              cy={y}
              r="3"
              vector-effect="non-scaling-stroke"
            />
          {/each}
        </g>
      {/each}
    </g>
  </svg>
</div>
