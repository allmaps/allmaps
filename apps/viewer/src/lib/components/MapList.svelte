<script lang="ts">
  import { resolve } from '$app/paths'

  import { LoadingSmall, Thumbnail } from '@allmaps/components'
  import { pink } from '@allmaps/tailwind'
  import { parseLanguageString } from '@allmaps/iiif-inspector'
  import {
    Image as ImageIcon,
    ImagesSquare as ImagesSquareIcon,
    CaretDown as CaretDownIcon,
    CaretUp as CaretUpIcon,
    Eye as EyeIcon,
    EyeSlash as EyeSlashIcon,
    Calendar as CalendarIcon,
    CirclesThree as CirclesThreeIcon,
    Function as FunctionIcon,
    Globe as GlobeIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import { getImagesState } from '$lib/state/images.svelte.js'
  import { getIiifState } from '$lib/state/iiif.svelte.js'
  import { getMapsState, type ThumbnailRegion } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import Metadata from '$lib/components/Metadata.svelte'
  import MetadataMapActions from '$lib/components/MetadataMapActions.svelte'
  import OrganizationBadge from '$lib/components/OrganizationBadge.svelte'
  import { getOrganizationSummary } from '$lib/shared/metadata.js'

  import type {
    MapsByCanvas,
    MapsByImage,
    MapsByManifest,
    MapsHierarchy
  } from '$lib/types/shared.js'
  import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'

  type Props = {
    mapsHierarchy: MapsHierarchy
    selectedMapId?: string
    open?: boolean
  }

  type ImageEntry = {
    canvas?: PartOfItem
    image: MapsByImage
  }

  const THUMBNAIL_RENDER_SIZE = 400
  const MASK_STROKE_RENDER_WIDTH = 10

  let {
    mapsHierarchy,
    selectedMapId = $bindable(),
    open = false
  }: Props = $props()

  const imagesState = getImagesState()
  const iiifState = getIiifState()
  const mapsState = getMapsState()
  const uiState = getUiState()
  const urlState = getUrlState()

  let metadataListElement = $state<HTMLDivElement>()
  let wasOpen = $state(false)

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

  let mapNumberByMap = $derived.by(buildMapNumberByMap)

  function getLabel(item?: PartOfItem | GeoreferencedMap['resource']) {
    const label = item && 'label' in item ? item.label : undefined
    return parseLanguageString(label, 'en') || item?.id || 'Untitled'
  }

  function getActualLabel(item?: PartOfItem | GeoreferencedMap['resource']) {
    const label = item && 'label' in item ? item.label : undefined
    return parseLanguageString(label, 'en') || undefined
  }

  function getTitle(
    item: PartOfItem | GeoreferencedMap['resource'] | undefined,
    fallback: string
  ) {
    const label = item && 'label' in item ? item.label : undefined
    return parseLanguageString(label, 'en') || fallback
  }

  function getImageTitle({ canvas }: ImageEntry) {
    return getActualLabel(canvas) || getTitle(undefined, 'IIIF Image')
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

  function getManifestImageEntries(manifest: MapsByManifest): ImageEntry[] {
    return manifest.mapsByCanvas.flatMap((canvas) =>
      canvas.mapsByImage.map((image) => ({
        canvas: canvas.canvas,
        image
      }))
    )
  }

  function getCanvasImageEntries(canvas: MapsByCanvas): ImageEntry[] {
    return canvas.mapsByImage.map((image) => ({
      canvas: canvas.canvas,
      image
    }))
  }

  function getImageEntries(images: MapsByImage[]): ImageEntry[] {
    return images.map((image) => ({ image }))
  }

  function getImageEntryMaps(imageEntries: ImageEntry[]) {
    return imageEntries.flatMap((entry) => entry.image.maps)
  }

  function getImageEntriesOrganizationSummary(imageEntries: ImageEntry[]) {
    return getOrganizationSummary(getImageEntryMaps(imageEntries))
  }

  function handleMetadataHeaderKeydown(event: KeyboardEvent, key: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      uiState.toggleMetadataSectionCollapsed(key)
    }
  }

  function getParsedManifest(manifestId?: string) {
    if (manifestId) {
      return iiifState.getParsedManifest(manifestId)
    }
  }

  function getParsedCanvas(manifestId: string | undefined, canvasId?: string) {
    if (!canvasId) {
      return
    }

    if (manifestId) {
      return iiifState.getParsedCanvas(manifestId, canvasId)
    }

    for (const iiifManifestId of iiifState.manifestIds) {
      const canvas = iiifState.getParsedCanvas(iiifManifestId, canvasId)

      if (canvas) {
        return canvas
      }
    }
  }

  function getImageServiceId(resource: GeoreferencedMap['resource']) {
    return resource.id.replace(/\/info\.json$/, '').replace(/\/$/, '')
  }

  function getImageInfoUrl(resource: GeoreferencedMap['resource']) {
    return `${getImageServiceId(resource)}/info.json`
  }

  // function getTransformationLabel(map: GeoreferencedMap) {
  //   let transformation = map.transformation

  //   if (!transformation) {
  //     transformation = {
  //       type: 'polynomial',
  //       options: {
  //         order: 1
  //       }
  //     }
  //   }

  //   if (
  //     transformation.type === 'polynomial' &&
  //     typeof transformation.options?.order === 'number'
  //   ) {
  //     if (transformation.options.order === 1) {
  //       return 'Polynomial (1ˢᵗ order)'
  //     } else if (transformation.options.order === 2) {
  //       return 'Polynomial (2ⁿᵈ order)'
  //     }
  //   } else if (transformation.type === 'thinPlateSpline') {
  //     return 'Thin Plate Spline'
  //   } else if (transformation.type === 'projective') {
  //     return 'Projective'
  //   } else if (transformation.type === 'helmert') {
  //     return 'Helmert'
  //   }

  //   return transformation.type
  // }

  // function getResourceCrsLabel(map: GeoreferencedMap) {
  //   const resourceCrs = map.resourceCrs

  //   if (!resourceCrs) {
  //     return
  //   }

  //   return resourceCrs.name || resourceCrs.id || 'Custom CRS'
  // }

  function addImageEntryMapNumbers(
    mapNumberByMap: WeakMap<GeoreferencedMap, number>,
    imageEntries: ImageEntry[],
    startIndex: number
  ) {
    let mapIndex = startIndex

    for (const entry of imageEntries) {
      for (const map of entry.image.maps) {
        mapNumberByMap.set(map, mapIndex)
        mapIndex += 1
      }
    }

    return mapIndex
  }

  function buildMapNumberByMap() {
    const mapNumberByMap = new WeakMap<GeoreferencedMap, number>()
    let mapIndex = 1

    for (const manifest of manifests) {
      mapIndex = addImageEntryMapNumbers(
        mapNumberByMap,
        getManifestImageEntries(manifest),
        mapIndex
      )
    }

    for (const canvas of canvases) {
      mapIndex = addImageEntryMapNumbers(
        mapNumberByMap,
        getCanvasImageEntries(canvas),
        mapIndex
      )
    }

    addImageEntryMapNumbers(mapNumberByMap, getImageEntries(images), mapIndex)

    return mapNumberByMap
  }

  function getMapNumber(map: GeoreferencedMap, fallbackIndex: number) {
    return mapNumberByMap.get(map) ?? fallbackIndex + 1
  }

  function getMapTitle(map: GeoreferencedMap, fallbackIndex: number) {
    return `Map ${getMapNumber(map, fallbackIndex)}`
  }

  function getGcpCountLabel(map: GeoreferencedMap) {
    return `${map.gcps.length} ${map.gcps.length === 1 ? 'GCP' : 'GCPs'}`
  }

  function getDateLabel(value?: string) {
    if (!value) {
      return
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  // function getMapFacts(map: GeoreferencedMap) {
  //   return [
  //     getGcpCountLabel(map),
  //     getTransformationLabel(map),
  //     getResourceCrsLabel(map)
  //   ].filter((fact) => fact !== undefined)
  // }

  function getMaskRegion(map: GeoreferencedMap) {
    return mapsState.getThumbnailRegion(map)
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

  function getMapUrl(mapId?: string) {
    return urlState.generateUrl(resolve('/(app)'), { mapId })
  }

  function handleToggleMapHidden(map: GeoreferencedMap) {
    if (map.id) {
      const isHidden = uiState.isMapHidden(map.id)
      uiState.toggleMapHidden(map.id)

      if (!isHidden && selectedMapId === map.id) {
        selectedMapId = undefined
      }
    }
  }

  function getImageMetadataKey(entry: ImageEntry) {
    return `image:${entry.canvas?.id ?? entry.image.resource.id}:${entry.image.resource.id}`
  }

  function getManifestMetadataKey(manifestId: string | undefined) {
    return manifestId ? `manifest:${manifestId}` : undefined
  }

  function isMetadataLoading(manifestId?: string) {
    return open && iiifState.isManifestLoading(manifestId)
  }

  async function scrollSelectedMapIntoView() {
    // await tick()

    const selectedMapElement = metadataListElement?.querySelector(
      '[data-selected-map="true"]'
    )

    if (!metadataListElement || !selectedMapElement) {
      return
    }

    const containerBounds = metadataListElement.getBoundingClientRect()
    const selectedMapBounds = selectedMapElement.getBoundingClientRect()
    const scrollTop =
      metadataListElement.scrollTop +
      selectedMapBounds.top -
      containerBounds.top -
      metadataListElement.clientHeight / 2 +
      selectedMapBounds.height / 2

    metadataListElement.scrollTop = Math.max(
      0,
      Math.min(
        scrollTop,
        metadataListElement.scrollHeight - metadataListElement.clientHeight
      )
    )
  }

  $effect(() => {
    if (open) {
      for (const manifestId of iiifState.manifestIds) {
        iiifState.fetchManifest(manifestId)
      }
    }
  })

  $effect(() => {
    if (!metadataListElement) {
      return
    }

    if (open && !wasOpen && selectedMapId) {
      scrollSelectedMapIntoView()
    } else if (
      !open &&
      Math.abs(metadataListElement.scrollTop - uiState.metadataScrollTop) > 1
    ) {
      metadataListElement.scrollTop = uiState.metadataScrollTop
    }

    wasOpen = open
  })
</script>

{#snippet gcpCount(map: GeoreferencedMap)}
  {@const gcps = map.gcps}
  <div>
    {#if gcps.length === 1}
      1 GCP
    {:else}
      {gcps.length} GCPs
    {/if}
  </div>
{/snippet}

{#snippet transformation(map: GeoreferencedMap)}
  {@const transformation = map.transformation || {
    type: 'polynomial',
    options: {
      order: 1
    }
  }}
  <div>
    {#if transformation.type === 'polynomial'}
      {#if transformation.options?.order === 1}
        Polynomial (1st order)
      {:else if transformation.options?.order === 2}
        Polynomial (2nd order)
      {/if}
    {:else if transformation.type === 'thinPlateSpline'}
      Thin Plate Spline
    {:else if transformation.type === 'projective'}
      Projective
    {:else if transformation.type === 'helmert'}
      Helmert
    {/if}
  </div>
{/snippet}

{#snippet resourceCrs(map: GeoreferencedMap)}
  {@const resourceCrs = map.resourceCrs}
  <div>
    {#if resourceCrs}
      {resourceCrs.name || resourceCrs.id || 'Custom CRS'}
    {:else}
      No CRS
    {/if}
  </div>
{/snippet}

{#snippet countLabel(count: number, singular: string)}
  <div class="shrink-0">
    {count}
    {count === 1 ? singular : `${singular}s`}
  </div>
{/snippet}
<!--
{#snippet factList(facts: string[])}
  {#if facts.length}
    <p class="text-xs text-gray-500">
      {#each facts as fact, index (fact)}
        {fact}{#if index < facts.length - 1}
          <span class="px-1 text-gray-300">·</span>
        {/if}
      {/each}
    </p>
  {/if}
{/snippet} -->

{#snippet metadataToggle(key: string, label: string, loading = false)}
  {@const collapsed = uiState.isMetadataSectionCollapsed(key)}
  <button
    type="button"
    class="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
    onclick={(event) => {
      event.stopPropagation()
      uiState.toggleMetadataSectionCollapsed(key)
    }}
    aria-expanded={!collapsed}
    aria-label={`${collapsed ? 'Show' : 'Hide'} ${label}`}
  >
    {#if loading}
      <LoadingSmall />
    {:else if collapsed}
      <CaretDownIcon class="size-4" weight="bold" />
    {:else}
      <CaretUpIcon class="size-4" weight="bold" />
    {/if}
  </button>
{/snippet}

{#snippet mapThumbnail(
  map: GeoreferencedMap,
  resource: GeoreferencedMap['resource']
)}
  {@const isSelected = selectedMapId === map.id && !uiState.isMapHidden(map.id)}
  {@const region = getMaskRegion(map)}
  <div
    class={[
      'flex aspect-square size-32 shrink-0 items-center justify-center overflow-hidden rounded border p-1',
      isSelected ? 'border-pink-200 bg-white/40' : 'border-gray-200 bg-white'
    ]}
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

{#snippet mapList(image: MapsByImage)}
  <ol class="flex flex-col rounded-b-lg overflow-hidden">
    {#each image.maps as map, index (map.id ?? index)}
      {@const isHidden = uiState.isMapHidden(map.id)}
      {@const isSelected = selectedMapId === map.id && !isHidden}
      {@const mapNumber = getMapNumber(map, index)}
      {@const canToggleHidden = mapsState.canHideMap(map.id)}
      <li
        class={[
          'p-3 flex w-full min-w-0 gap-3 transition-colors text-gray-700',
          isHidden ? '' : isSelected ? 'bg-pink/5 text-pink' : ''
        ]}
      >
        {#if isHidden}
          <span
            data-selected-map={isSelected ? 'true' : undefined}
            class="shrink-0 rounded opacity-50"
            aria-label={map.id ?? `Map ${mapNumber}`}
          >
            {@render mapThumbnail(map, image.resource)}
            <span class="sr-only">{map.id ?? `Map ${mapNumber}`}</span>
          </span>
        {:else}
          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          <a
            href={getMapUrl(map.id)}
            aria-current={isSelected ? 'true' : undefined}
            data-selected-map={isSelected ? 'true' : undefined}
            class="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
            aria-label={map.id ?? `Map ${mapNumber}`}
          >
            {@render mapThumbnail(map, image.resource)}
            <span class="sr-only">{map.id ?? `Map ${mapNumber}`}</span>
          </a>
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {/if}
        <div class="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div
            class="grid grid-cols-[min-content_1fr_min-content] min-w-0 items-center gap-3"
          >
            <h4 class="truncate text-sm font-medium flex items-center gap-1">
              <MapTrifoldIcon class="size-6 inline-block" />
              {getMapTitle(map, index)}
            </h4>
            <span class="text-xs opacity-75">
              <CalendarIcon class="size-4 inline-block mr-1" />
              {getDateLabel(map.modified)}
            </span>
            {#if canToggleHidden}
              <button
                type="button"
                class={[
                  'cursor-pointer inline-flex h-7 px-2 py-1 items-center gap-1.5 rounded text-xs transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink',
                  isHidden
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-pink/10 hover:bg-pink/20 text-pink'
                ]}
                onclick={() => handleToggleMapHidden(map)}
                aria-label={isHidden ? 'Show map' : 'Hide map'}
              >
                {#if isHidden}
                  <span>Hidden</span>
                  <EyeSlashIcon class="size-6" />
                {:else}
                  <span>Visible</span>
                  <EyeIcon class="size-6 text-pink" />
                {/if}
              </button>
            {/if}
          </div>

          <div class="flex flex-row items-center justify-between gap-3 text-xs">
            <div
              class="grid grid-cols-[min-content_1fr] gap-x-3 gap-y-1 text-xs"
            >
              <dt class="font-medium flex items-center gap-1">
                <CirclesThreeIcon class="size-4 inline-block " />
                Control Points
              </dt>
              <dd>
                {@render gcpCount(map)}
              </dd>
              <dt class="font-medium flex items-center gap-1">
                <FunctionIcon class="size-4 inline-block " />
                Transformation
              </dt>
              <dd class="">
                {@render transformation(map)}
              </dd>
              <dt class="font-medium flex items-center gap-1">
                <GlobeIcon class="size-4 inline-block " />
                Projection
              </dt>
              <dd class="">
                {@render resourceCrs(map)}
              </dd>
            </div>
          </div>

          <MetadataMapActions
            {map}
            {isSelected}
            isEmbedded={mapsState.isEmbeddedMap(map.id)}
          />
        </div>
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet imageSection(
  entry: ImageEntry,
  manifestId?: string,
  showOrganization = false
)}
  {@const canvas = getParsedCanvas(manifestId, entry.canvas?.id)}
  {@const imageTitle = getImageTitle(entry)}
  {@const metadataKey = getImageMetadataKey(entry)}
  {@const loading = isMetadataLoading(manifestId)}
  {@const organization = showOrganization
    ? getImageEntriesOrganizationSummary([entry])
    : undefined}
  <section class="rounded-xl bg-gray-100/20 inset-shadow-sm">
    <!-- class="-m-2 mb-2 space-y-1 bg-gray-50 px-2 py-2 border-b border-gray-200" -->
    <div class="bg-gray-50 mx-3 border-b border-gray-200 py-3">
      <div
        role="button"
        tabindex="0"
        class="flex cursor-pointer items-center justify-between gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
        onclick={() => uiState.toggleMetadataSectionCollapsed(metadataKey)}
        onkeydown={(event) => handleMetadataHeaderKeydown(event, metadataKey)}
        aria-expanded={!uiState.isMetadataSectionCollapsed(metadataKey)}
      >
        <div class="flex min-w-0 items-center gap-2">
          <!-- <IIIFSource sourceType="image" /> -->
          <ImageIcon class="size-6 shrink-0" />
          <h3 class="min-w-0 text-sm font-semibold text-gray-900">
            <span class="block select-none max-w-full truncate text-left">
              {imageTitle}
            </span>
          </h3>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          {#if showOrganization}
            <OrganizationBadge {organization} link />
          {/if}
          {#if entry.image.maps.length > 1}
            {@render countLabel(entry.image.maps.length, 'map')}
          {/if}
          {@render metadataToggle(metadataKey, 'image metadata', loading)}
        </div>
      </div>
      {#if !uiState.isMetadataSectionCollapsed(metadataKey)}
        <Metadata
          resource={canvas}
          {loading}
          uri={getImageInfoUrl(entry.image.resource)}
          uriLabel={getImageServiceId(entry.image.resource)}
          label={getActualLabel(entry.canvas)}
          width={entry.image.resource.width}
          height={entry.image.resource.height}
          class="mt-2"
        />
      {/if}
    </div>
    {@render mapList(entry.image)}
  </section>
{/snippet}

{#snippet manifestSection(
  title: string,
  imageEntries: ImageEntry[],
  manifestId?: string,
  metadataKey = getManifestMetadataKey(manifestId),
  metadataUri = manifestId,
  label?: string
)}
  {@const organization = getImageEntriesOrganizationSummary(imageEntries)}
  {@const parsedManifest = getParsedManifest(manifestId)}
  {@const loading = isMetadataLoading(manifestId)}
  <div
    role="button"
    tabindex="0"
    class="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
    onclick={() =>
      metadataKey && uiState.toggleMetadataSectionCollapsed(metadataKey)}
    onkeydown={(event) =>
      metadataKey && handleMetadataHeaderKeydown(event, metadataKey)}
    aria-expanded={metadataKey
      ? !uiState.isMetadataSectionCollapsed(metadataKey)
      : undefined}
  >
    <div class="flex min-w-0 items-center gap-2">
      <!-- <IIIFSource sourceType="manifest" /> -->
      <ImagesSquareIcon class="size-6 shrink-0" />
      <h2 class="min-w-0 font-semibold">
        {#if metadataKey}
          <span class="select-none block max-w-full truncate text-left"
            >{title}</span
          >
        {:else}
          <span class="select-none block truncate">{title}</span>
        {/if}
      </h2>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <OrganizationBadge {organization} link />
      {#if metadataKey}
        {@render metadataToggle(metadataKey, 'manifest metadata', loading)}
      {/if}
    </div>
  </div>
  {#if metadataKey && !uiState.isMetadataSectionCollapsed(metadataKey)}
    <Metadata
      resource={parsedManifest}
      {loading}
      uri={metadataUri}
      uriLabel={metadataUri}
      {label}
      class="mt-2"
    />
  {/if}

  {#each imageEntries as entry (entry.image.resource.id)}
    {@render imageSection(entry, manifestId)}
  {/each}
{/snippet}

{#snippet canvasSection(canvas: MapsByCanvas, index: number, count: number)}
  {@const imageEntries = getCanvasImageEntries(canvas)}
  {@const title = getTitle(canvas.canvas, 'IIIF Canvas')}
  {@const metadataKey = `canvas:${canvas.canvas.id}`}
  {@const mapCount = countCanvasMaps(canvas)}
  {@const organization = getImageEntriesOrganizationSummary(imageEntries)}
  {#if imageEntries.length === 1}
    {@render imageSection(imageEntries[0], undefined, true)}
  {:else}
    <div
      role="button"
      tabindex="0"
      class="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
      onclick={() => uiState.toggleMetadataSectionCollapsed(metadataKey)}
      onkeydown={(event) => handleMetadataHeaderKeydown(event, metadataKey)}
      aria-expanded={!uiState.isMetadataSectionCollapsed(metadataKey)}
    >
      <div class="flex min-w-0 items-center gap-2">
        <ImageIcon class="size-6 shrink-0" />
        <h2 class="min-w-0 font-semibold">
          <span class="block max-w-full truncate text-left">{title}</span>
        </h2>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <OrganizationBadge {organization} link />
        {#if mapCount > 1}
          {@render countLabel(mapCount, 'map')}
        {/if}
        {@render metadataToggle(metadataKey, 'canvas metadata', false)}
      </div>
    </div>
    {#if !uiState.isMetadataSectionCollapsed(metadataKey)}
      <Metadata
        uri={canvas.canvas.id}
        uriLabel={canvas.canvas.id}
        label={getActualLabel(canvas.canvas)}
        class="mt-2"
      />
    {/if}

    {#each imageEntries as entry (entry.image.resource.id)}
      {@render imageSection(entry)}
    {/each}
  {/if}
{/snippet}

{#snippet imageOnlySection(images: MapsByImage[])}
  {@const imageEntries = getImageEntries(images)}
  {#each imageEntries as entry (entry.image.resource.id)}
    {@render imageSection(entry, undefined, true)}
  {/each}
{/snippet}

<div
  bind:this={metadataListElement}
  onscroll={handleScroll}
  class="max-h-[60vh] overflow-auto space-y-3"
>
  {#each manifests as manifest (manifest.manifest.id)}
    <section class="p-3 border border-gray-200 rounded-xl space-y-2">
      {@render manifestSection(
        getTitle(manifest.manifest, 'IIIF Manifest'),
        getManifestImageEntries(manifest),
        manifest.manifest.id,
        undefined,
        undefined,
        getActualLabel(manifest.manifest)
      )}
    </section>
  {/each}

  {#if canvases.length}
    {#each canvases as canvas, index (canvas.canvas.id)}
      <section class="p-3 border border-gray-200 rounded-xl space-y-2">
        {@render canvasSection(canvas, index, canvases.length)}
      </section>
    {/each}
  {/if}

  {#if images.length}
    <section class="p-3 border border-gray-200 rounded-xl space-y-2">
      {@render imageOnlySection(images)}
    </section>
  {/if}
</div>
