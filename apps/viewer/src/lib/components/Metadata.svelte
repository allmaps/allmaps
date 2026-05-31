<script lang="ts">
  import { tick } from 'svelte'

  import { Thumbnail } from '@allmaps/components'
  import { computeBbox } from '@allmaps/stdlib'
  import { pink } from '@allmaps/tailwind'

  import { parseLanguageString } from '$lib/shared/iiif.js'
  import { getImagesState } from '$lib/state/images.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import type {
    MapsByCanvas,
    MapsByImage,
    MapsByManifest,
    MapsHierarchy
  } from '$lib/types/shared.js'
  import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'

  type ThumbnailRegion = {
    x: number
    y: number
    width: number
    height: number
  }

  type Props = {
    mapsHierarchy: MapsHierarchy
    selectedMapId?: string
    open?: boolean
  }

  const THUMBNAIL_RENDER_SIZE = 400
  const MASK_STROKE_RENDER_WIDTH = 10

  let {
    mapsHierarchy,
    selectedMapId = $bindable(),
    open = false
  }: Props = $props()

  const imagesState = getImagesState()
  const uiState = getUiState()

  let metadataListElement = $state<HTMLDivElement>()

  let manifests = $derived(
    [...(mapsHierarchy.mapsByManifest ?? [])].sort(
      (a, b) => countManifestMaps(b) - countManifestMaps(a)
    )
  )
  let canvases = $derived(
    [...(mapsHierarchy.mapsByCanvas ?? [])].sort(
      (a, b) => countCanvasMaps(b) - countCanvasMaps(a)
    )
  )
  let images = $derived(
    [...(mapsHierarchy.mapsByImage ?? [])].sort(
      (a, b) => b.maps.length - a.maps.length
    )
  )

  function getLabel(item?: PartOfItem | GeoreferencedMap['resource']) {
    const label = item && 'label' in item ? item.label : undefined
    return parseLanguageString(label, 'en') || item?.id || 'Untitled'
  }

  function countCanvasMaps(canvas: MapsByCanvas) {
    return canvas.mapsByImage.reduce(
      (count, image) => count + image.maps.length,
      0
    )
  }

  function countManifestMaps(manifest: MapsByManifest) {
    return manifest.mapsByCanvas.reduce(
      (count, canvas) => count + countCanvasMaps(canvas),
      0
    )
  }

  function getMaskRegion(
    map: GeoreferencedMap,
    resource: GeoreferencedMap['resource']
  ): ThumbnailRegion | undefined {
    if (!resource.width || !resource.height) {
      return
    }

    const [minX, minY, maxX, maxY] = computeBbox(map.resourceMask)
    const width = maxX - minX
    const height = maxY - minY
    const padding = Math.max(width, height) * 0.1

    const x = Math.max(0, minX - padding)
    const y = Math.max(0, minY - padding)
    const right = Math.min(resource.width, maxX + padding)
    const bottom = Math.min(resource.height, maxY + padding)

    if (right <= x || bottom <= y) {
      return
    }

    return {
      x,
      y,
      width: right - x,
      height: bottom - y
    }
  }

  function getMaskStrokeWidth(
    resource: GeoreferencedMap['resource'],
    region?: ThumbnailRegion
  ) {
    const sourceWidth = region?.width || resource.width
    const sourceHeight = region?.height || resource.height

    if (!sourceWidth || !sourceHeight) {
      return MASK_STROKE_RENDER_WIDTH
    }

    return (
      (MASK_STROKE_RENDER_WIDTH / THUMBNAIL_RENDER_SIZE) *
      Math.max(sourceWidth, sourceHeight)
    )
  }

  function handleScroll() {
    if (metadataListElement) {
      uiState.metadataScrollTop = metadataListElement.scrollTop
    }
  }

  function selectMap(mapId?: string) {
    selectedMapId = mapId
  }

  async function scrollSelectedMapIntoView() {
    await tick()

    const selectedMapElement = metadataListElement?.querySelector(
      '[data-selected-map="true"]'
    )

    selectedMapElement?.scrollIntoView({
      block: 'nearest'
    })
  }

  $effect(() => {
    if (!metadataListElement) {
      return
    }

    if (open && selectedMapId) {
      scrollSelectedMapIntoView()
    } else if (
      Math.abs(metadataListElement.scrollTop - uiState.metadataScrollTop) > 1
    ) {
      metadataListElement.scrollTop = uiState.metadataScrollTop
    }
  })
</script>

<!--
Implementation:
- show list of manifests, sorted by map count (maybe show optional filter options on top)
Per manifest:
- show list of images with thumbnails from thumbnail state, with label
Per image
- show list of maps (if >1), otherwise show single map

Also show maps/images without manifest
-->

{#snippet countLabel(count: number, singular: string)}
  <span class="text-xs text-gray-500">
    {count}
    {count === 1 ? singular : `${singular}s`}
  </span>
{/snippet}

{#snippet mapList(maps: GeoreferencedMap[])}
  <ol class="mt-2 space-y-1 text-sm text-gray-700">
    {#each maps as map, index (map.id ?? index)}
      {@const isSelected = selectedMapId === map.id}
      <li>
        <button
          type="button"
          onclick={() => selectMap(map.id)}
          aria-pressed={isSelected}
          data-selected-map={isSelected ? 'true' : undefined}
          class={[
            'flex w-full min-w-0 items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors',
            isSelected
              ? 'bg-pink/10 font-medium text-pink'
              : 'text-gray-700 hover:bg-gray-50 hover:text-black'
          ]}
        >
          <span class="truncate">{map.id ?? `Map ${index + 1}`}</span>
          {#if isSelected}
            <span class="shrink-0 text-xs text-pink">Selected</span>
          {/if}
        </button>
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet mapThumbnail(
  map: GeoreferencedMap,
  resource: GeoreferencedMap['resource']
)}
  {@const isSelected = selectedMapId === map.id}
  {@const region = getMaskRegion(map, resource)}
  <div
    class="flex aspect-square size-20 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50"
  >
    <Thumbnail
      imageBitmap={imagesState.thumbnails.get(resource.id)}
      width={THUMBNAIL_RENDER_SIZE}
      sourceWidth={resource.width}
      sourceHeight={resource.height}
      mode="contain"
      {region}
      resourceMasks={[
        {
          resourceMask: map.resourceMask,

          stroke: pink,
          strokeWidth:
            getMaskStrokeWidth(resource, region) * (isSelected ? 2 : 1)
        }
      ]}
      alt={map.id ?? getLabel(resource)}
    />
  </div>
{/snippet}

{#snippet imageThumbnail(image: MapsByImage)}
  <div
    class="flex aspect-square size-20 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50"
  >
    <Thumbnail
      imageBitmap={imagesState.thumbnails.get(image.resource.id)}
      width={THUMBNAIL_RENDER_SIZE}
      sourceWidth={image.resource.width}
      sourceHeight={image.resource.height}
      mode="contain"
      resourceMasks={image.maps.map((map) => ({
        resourceMask: map.resourceMask,
        stroke: pink,
        strokeWidth:
          getMaskStrokeWidth(image.resource) *
          (selectedMapId === map.id ? 2 : 1)
      }))}
      alt={getLabel(image.resource)}
    />
  </div>
{/snippet}

{#snippet mapThumbnailList(
  maps: GeoreferencedMap[],
  resource: GeoreferencedMap['resource']
)}
  <ol class="mt-2 space-y-1 text-sm text-gray-700">
    {#each maps as map, index (map.id ?? index)}
      {@const isSelected = selectedMapId === map.id}
      <li>
        <button
          type="button"
          onclick={() => selectMap(map.id)}
          aria-pressed={isSelected}
          data-selected-map={isSelected ? 'true' : undefined}
          class={[
            'flex w-full min-w-0 items-center gap-2 rounded p-1 text-left transition-colors',
            isSelected
              ? 'bg-pink/10 font-medium text-pink'
              : 'text-gray-700 hover:bg-gray-50 hover:text-black'
          ]}
        >
          {@render mapThumbnail(map, resource)}
          <span class="min-w-0 flex-1 truncate"
            >{map.id ?? `Map ${index + 1}`}</span
          >
          {#if isSelected}
            <span class="shrink-0 text-xs text-pink">Selected</span>
          {/if}
        </button>
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet imageList(mapsByImage: MapsByImage[])}
  <div class="space-y-2">
    {#each mapsByImage as image (image.resource.id)}
      <section class="flex gap-3 rounded-md border border-gray-100 p-2">
        {#if image.maps.length === 1}
          {@render mapThumbnail(image.maps[0], image.resource)}
        {:else}
          {@render imageThumbnail(image)}
        {/if}
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-3">
            <h4 class="truncate text-sm font-medium">
              {getLabel(image.resource)}
            </h4>
            {@render countLabel(image.maps.length, 'map')}
          </div>
          {#if image.maps.length > 1}
            {@render mapThumbnailList(image.maps, image.resource)}
          {:else}
            {@render mapList(image.maps)}
          {/if}
        </div>
      </section>
    {/each}
  </div>
{/snippet}

<div
  bind:this={metadataListElement}
  onscroll={handleScroll}
  class="max-h-[60vh] space-y-4 overflow-auto pr-1"
>
  {#each manifests as manifest (manifest.manifest.id)}
    <section class="space-y-2">
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="truncate font-semibold">{getLabel(manifest.manifest)}</h3>
        {@render countLabel(countManifestMaps(manifest), 'map')}
      </div>

      <div class="space-y-3">
        {#each manifest.mapsByCanvas as canvas (canvas.canvas.id)}
          <section class="space-y-2">
            <div class="flex items-baseline justify-between gap-3">
              <h4 class="truncate text-sm font-medium text-gray-700">
                {getLabel(canvas.canvas)}
              </h4>
              {@render countLabel(countCanvasMaps(canvas), 'map')}
            </div>
            {@render imageList(canvas.mapsByImage)}
          </section>
        {/each}
      </div>
    </section>
  {/each}

  {#if canvases.length}
    <section class="space-y-3">
      <!-- <h3 class="font-semibold">Images without manifest</h3> -->
      {#each canvases as canvas (canvas.canvas.id)}
        <section class="space-y-2">
          <div class="flex items-baseline justify-between gap-3">
            <h4 class="truncate text-sm font-medium text-gray-700">
              {getLabel(canvas.canvas)}
            </h4>
            {@render countLabel(countCanvasMaps(canvas), 'map')}
          </div>
          {@render imageList(canvas.mapsByImage)}
        </section>
      {/each}
    </section>
  {/if}

  {#if images.length}
    <section class="space-y-2">
      <!-- <h3 class="font-semibold">Maps without manifest</h3> -->
      {@render imageList(images)}
    </section>
  {/if}
</div>
