<script lang="ts">
  import type { MaskedMapData } from '$lib/masked-map.js'

  let {
    map,
    alt,
    outlineColor = 'currentColor',
    outlineClass,
    outlineWidth = 4,
    maxHeight,
    sizes
  }: {
    map: MaskedMapData
    alt: string
    outlineColor?: string
    outlineClass?: string
    outlineWidth?: number
    maxHeight?: string
    sizes?: string
  } = $props()

  let failedImageUrl = $state<string>()
</script>

<div
  class="relative grid min-w-0 place-items-center overflow-hidden"
  style:aspect-ratio={`${map.width} / ${map.height}`}
  style:width={maxHeight
    ? `min(100%, calc((${maxHeight}) * ${map.width / map.height}))`
    : '100%'}
>
  {#if failedImageUrl === map.imageUrl}
    <span
      class="text-center text-sm text-[#63686a]"
      role="img"
      aria-label={alt}
    >
      Map preview unavailable
    </span>
  {:else}
    <img
      class="absolute block max-w-none"
      src={map.imageUrl}
      srcset={map.imageSrcset}
      sizes={sizes ??
        map.imageSizes ??
        'auto, (max-width: 850px) calc(100vw - 7rem), 520px'}
      {alt}
      width={map.intrinsicWidth}
      height={map.intrinsicHeight}
      loading="lazy"
      decoding="async"
      style:left={`${(map.imageX / map.width) * 100}%`}
      style:top={`${(map.imageY / map.height) * 100}%`}
      style:width={`${(map.imageWidth / map.width) * 100}%`}
      style:height={`${(map.imageHeight / map.height) * 100}%`}
      style:clip-path={map.imageClipPath}
      onerror={() => (failedImageUrl = map.imageUrl)}
    />
    <svg
      class="pointer-events-none absolute inset-0 block size-full max-w-none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${map.width} ${map.height}`}
      width={map.width}
      height={map.height}
      aria-hidden="true"
    >
      <polygon
        class={outlineClass}
        points={map.polygonPoints}
        fill="none"
        stroke={outlineColor}
        stroke-width={outlineWidth}
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  {/if}
</div>
