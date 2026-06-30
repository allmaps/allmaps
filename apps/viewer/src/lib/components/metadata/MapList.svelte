<script lang="ts">
  import { resolve } from '$app/paths'
  import { untrack } from 'svelte'

  import { Image as ImageIcon, Info as InfoIcon } from 'phosphor-svelte'

  import { parseLanguageString } from '@allmaps/iiif-inspector'

  import {
    getImagesState,
    type ImageDisplayError
  } from '$lib/state/images.svelte.js'

  import { getIiifState } from '$lib/state/iiif.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import Metadata from './Metadata.svelte'
  import MapRow from './map-list/MapRow.svelte'
  import MapRowError from './map-list/MapRowError.svelte'
  import OrganizationBadge from './OrganizationBadge.svelte'
  import ResourceThumbnail from './map-list/ResourceThumbnail.svelte'
  import SourceSummary from './SourceSummary.svelte'

  import { getOrganizationSummary } from '$lib/shared/metadata.js'

  import type { MapListRow, ThumbnailErrorMessage } from './map-list/types.js'
  import type {
    InvalidGeoreferenceAnnotation,
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

  type MapNumberState = {
    mapNumberByMap: WeakMap<GeoreferencedMap, number>
    mapNumberByInvalidAnnotation: WeakMap<InvalidGeoreferenceAnnotation, number>
  }

  const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  let {
    mapsHierarchy,
    selectedMapId = $bindable(),
    open = false
  }: Props = $props()

  const imagesState = getImagesState()
  const iiifState = getIiifState()
  const mapsState = getMapsState()
  const sourceState = getSourceState()
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
      (a, b) => countImageMaps(b) - countImageMaps(a)
    )
  )

  let mapNumberState = $derived.by(buildMapNumberState)
  let mapRowsByImage = $derived.by(buildMapRowsByImage)
  let hiddenMapIdsSet = $derived(new Set(uiState.hiddenMapIds))
  let visibleMapCount = $derived(mapsState.visibleMapCount)

  function getLabel(item?: PartOfItem | GeoreferencedMap['resource']) {
    const label = item && 'label' in item ? item.label : undefined
    return parseLanguageString(label, 'en') || item?.id || 'Untitled'
  }

  function getActualLabel(item?: PartOfItem | GeoreferencedMap['resource']) {
    const label = item && 'label' in item ? item.label : undefined
    const labelString = parseLanguageString(label, 'en')?.trim()

    return labelString && labelString !== '-' ? labelString : undefined
  }

  function getTitle(
    item: PartOfItem | GeoreferencedMap['resource'] | undefined,
    fallback: string
  ) {
    const label = item && 'label' in item ? item.label : undefined
    return parseLanguageString(label, 'en') || fallback
  }

  function getImageTitle({ canvas }: ImageEntry) {
    return getActualLabel(canvas) || getTitle(undefined, 'IIIF Image Service')
  }

  function countImageMaps(image: MapsByImage) {
    return image.maps.length + (image.invalidAnnotations?.length ?? 0)
  }

  function countCanvasMaps(canvas: MapsByCanvas) {
    return canvas.mapsByImage.reduce(
      (count, image) => count + countImageMaps(image),
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

  function getGcpCountLabel(map: GeoreferencedMap) {
    return `${map.gcps.length} ${map.gcps.length === 1 ? 'GCP' : 'GCPs'}`
  }

  function getTransformationLabel(map: GeoreferencedMap) {
    const transformation = map.transformation || {
      type: 'polynomial',
      options: {
        order: 1
      }
    }

    if (transformation.type === 'polynomial') {
      if (transformation.options?.order === 1) {
        return 'Polynomial (1st order)'
      } else if (transformation.options?.order === 2) {
        return 'Polynomial (2nd order)'
      }
    } else if (transformation.type === 'thinPlateSpline') {
      return 'Thin Plate Spline'
    } else if (transformation.type === 'projective') {
      return 'Projective'
    } else if (transformation.type === 'helmert') {
      return 'Helmert'
    }

    return transformation.type
  }

  function getResourceCrsLabel(map: GeoreferencedMap) {
    const resourceCrs = map.resourceCrs

    if (!resourceCrs) {
      return 'No projection'
    }

    return resourceCrs.name || resourceCrs.id || 'Custom CRS'
  }

  function getThumbnailErrorTitle(error: ImageDisplayError) {
    if (error.source === 'info-json') {
      return 'Could not load image information'
    } else if (error.source === 'tile') {
      return 'Could not load image tile'
    }

    return 'Could not load thumbnail'
  }

  function getThumbnailErrorMessage(error: ImageDisplayError) {
    if (error.status) {
      return `HTTP ${error.status}`
    } else if (error.corsLikely || error.kind === 'network-or-cors') {
      return 'Network or CORS'
    } else if (error.kind === 'parse') {
      return 'Parse error'
    }

    return error.message
  }

  function getThumbnailDisplayError(
    imageId: string
  ): ThumbnailErrorMessage | undefined {
    const error = imagesState.getThumbnailDisplayError(imageId)

    if (!error) {
      return
    }

    return {
      title: getThumbnailErrorTitle(error),
      message: getThumbnailErrorMessage(error)
    }
  }

  function getMapImageError(
    imageId: string
  ): ThumbnailErrorMessage | undefined {
    const error = imagesState.getImageError(imageId)

    if (!error) {
      return
    }

    return {
      title:
        error.source === 'tile'
          ? 'Could not load map image'
          : getThumbnailErrorTitle(error),
      message: getThumbnailErrorMessage(error)
    }
  }

  function addImageEntryMapNumbers(
    mapNumberState: MapNumberState,
    imageEntries: ImageEntry[],
    startIndex: number
  ) {
    let mapIndex = startIndex

    for (const entry of imageEntries) {
      for (const map of entry.image.maps) {
        mapNumberState.mapNumberByMap.set(map, mapIndex)
        mapIndex += 1
      }

      for (const invalidAnnotation of entry.image.invalidAnnotations ?? []) {
        mapNumberState.mapNumberByInvalidAnnotation.set(
          invalidAnnotation,
          mapIndex
        )
        mapIndex += 1
      }
    }

    return mapIndex
  }

  function buildMapNumberState(): MapNumberState {
    const mapNumberState = {
      mapNumberByMap: new WeakMap<GeoreferencedMap, number>(),
      mapNumberByInvalidAnnotation: new WeakMap<
        InvalidGeoreferenceAnnotation,
        number
      >()
    }
    let mapIndex = 1

    for (const manifest of manifests) {
      mapIndex = addImageEntryMapNumbers(
        mapNumberState,
        getManifestImageEntries(manifest),
        mapIndex
      )
    }

    for (const canvas of canvases) {
      mapIndex = addImageEntryMapNumbers(
        mapNumberState,
        getCanvasImageEntries(canvas),
        mapIndex
      )
    }

    addImageEntryMapNumbers(mapNumberState, getImageEntries(images), mapIndex)

    return mapNumberState
  }

  function getMapNumber(
    map: GeoreferencedMap,
    fallbackIndex: number,
    currentMapNumberState = mapNumberState
  ) {
    return currentMapNumberState.mapNumberByMap.get(map) ?? fallbackIndex + 1
  }

  function getInvalidAnnotationMapNumber(
    invalidAnnotation: InvalidGeoreferenceAnnotation,
    fallbackIndex: number,
    currentMapNumberState = mapNumberState
  ) {
    return (
      currentMapNumberState.mapNumberByInvalidAnnotation.get(
        invalidAnnotation
      ) ?? fallbackIndex + 1
    )
  }

  function getMapTitle(mapNumber: number) {
    return `Map ${mapNumber}`
  }

  function getDateLabel(value?: string) {
    if (!value) {
      return
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return
    }

    return dateLabelFormatter.format(date)
  }

  function handleScroll() {
    if (metadataListElement) {
      uiState.metadataScrollTop = metadataListElement.scrollTop
    }
  }

  function getMapUrl(mapId?: string) {
    return untrack(() => urlState.generateUrl(resolve('/(app)'), { mapId }))
  }

  function buildMapUrlsByMapId(imageEntries: ImageEntry[]) {
    const mapIds = imageEntries.flatMap((entry) =>
      entry.image.maps.map((map) => map.id)
    )

    return untrack(() =>
      urlState.generateUrlsForParam(resolve('/(app)'), 'mapId', mapIds)
    )
  }

  function buildMapRow(
    image: MapsByImage,
    map: GeoreferencedMap,
    index: number,
    currentMapNumberState: MapNumberState,
    mapUrlsByMapId: Map<string | undefined, string>
  ): MapListRow {
    const mapNumber = getMapNumber(map, index, currentMapNumberState)

    return {
      map,
      mapId: map.id,
      resource: image.resource,
      mapNumber,
      title: getMapTitle(mapNumber),
      modifiedLabel: getDateLabel(map.modified),
      gcpCountLabel: getGcpCountLabel(map),
      transformationLabel: getTransformationLabel(map),
      resourceCrsLabel: getResourceCrsLabel(map),
      mapUrl: mapUrlsByMapId.get(map.id) ?? getMapUrl(map.id),
      thumbnailAlt: map.id ?? getLabel(image.resource),
      renderError: mapsState.getMapRenderError(map.id),
      isEmbedded: mapsState.isEmbeddedMap(map.id)
    }
  }

  function buildImageRows(
    image: MapsByImage,
    currentMapNumberState: MapNumberState,
    mapUrlsByMapId: Map<string | undefined, string>
  ) {
    return image.maps.map((map, index) =>
      buildMapRow(image, map, index, currentMapNumberState, mapUrlsByMapId)
    )
  }

  function addImageEntryRows(
    rowsByImage: WeakMap<MapsByImage, MapListRow[]>,
    imageEntries: ImageEntry[],
    currentMapNumberState: MapNumberState,
    mapUrlsByMapId: Map<string | undefined, string>
  ) {
    for (const entry of imageEntries) {
      rowsByImage.set(
        entry.image,
        buildImageRows(entry.image, currentMapNumberState, mapUrlsByMapId)
      )
    }
  }

  function buildMapRowsByImage() {
    const rowsByImage = new WeakMap<MapsByImage, MapListRow[]>()
    const currentMapNumberState = mapNumberState
    const imageEntries = [
      ...manifests.flatMap((manifest) => getManifestImageEntries(manifest)),
      ...canvases.flatMap((canvas) => getCanvasImageEntries(canvas)),
      ...getImageEntries(images)
    ]
    const mapUrlsByMapId = buildMapUrlsByMapId(imageEntries)

    for (const manifest of manifests) {
      addImageEntryRows(
        rowsByImage,
        getManifestImageEntries(manifest),
        currentMapNumberState,
        mapUrlsByMapId
      )
    }

    for (const canvas of canvases) {
      addImageEntryRows(
        rowsByImage,
        getCanvasImageEntries(canvas),
        currentMapNumberState,
        mapUrlsByMapId
      )
    }

    addImageEntryRows(
      rowsByImage,
      getImageEntries(images),
      currentMapNumberState,
      mapUrlsByMapId
    )

    return rowsByImage
  }

  function getMapRows(image: MapsByImage) {
    return mapRowsByImage.get(image) ?? []
  }

  function handleToggleMapHidden(row: MapListRow) {
    if (row.mapId) {
      const isHidden = hiddenMapIdsSet.has(row.mapId)
      uiState.toggleMapHidden(row.mapId)

      if (!isHidden && selectedMapId === row.mapId) {
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

  async function scrollSelectedMapIntoView() {
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

{#snippet metadataToggle(key: string, label: string)}
  {@const collapsed = uiState.isMetadataSectionCollapsed(key)}
  <button
    type="button"
    class={[
      'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-black/80 transition-colors hover:bg-gray-100 hover:text-gray-900',
      !collapsed ? 'bg-pink-100 text-pink' : ''
    ]}
    onclick={(event) => {
      event.stopPropagation()
      uiState.toggleMetadataSectionCollapsed(key)
    }}
    aria-expanded={!collapsed}
    aria-label={`${collapsed ? 'Show' : 'Hide'} ${label}`}
  >
    <InfoIcon class="size-5" weight="bold" />
  </button>
{/snippet}

{#snippet mapList(image: MapsByImage)}
  {@const rows = getMapRows(image)}
  {@const invalidAnnotations = image.invalidAnnotations ?? []}
  <ol class="flex flex-col overflow-hidden gap-4">
    {#each rows as row (row.mapId ?? row.mapNumber)}
      {@const isHidden = row.mapId ? hiddenMapIdsSet.has(row.mapId) : false}
      {@const isSelectable = mapsState.isMapSelectable(row.mapId)}
      {@const isSelected =
        selectedMapId === row.mapId && !isHidden && isSelectable}
      {@const canToggleHidden =
        !!row.mapId && (isHidden || visibleMapCount > 1)}
      {@const thumbnailError = getThumbnailDisplayError(row.resource.id)}
      {@const mapImageError = getMapImageError(row.resource.id)}
      <MapRow
        {row}
        selected={isSelected}
        selectable={isSelectable}
        hidden={isHidden}
        {canToggleHidden}
        errorTitle={row.renderError
          ? 'Could not render this map'
          : mapImageError?.title}
        errorMessage={row.renderError?.message ?? mapImageError?.message}
        {thumbnailError}
        thumbnails={imagesState.thumbnails}
        onToggleHidden={handleToggleMapHidden}
      />
    {/each}
    {#each invalidAnnotations as invalidAnnotation, index (invalidAnnotation.id)}
      {@const mapNumber = getInvalidAnnotationMapNumber(
        invalidAnnotation,
        rows.length + index
      )}
      {@const thumbnail = imagesState.thumbnails.get(
        invalidAnnotation.resource.id
      )}
      {@const thumbnailError = thumbnail
        ? undefined
        : getThumbnailDisplayError(invalidAnnotation.resource.id)}
      <li class="w-full flex flex-row min-w-0 gap-3 text-gray-700">
        <ResourceThumbnail
          resource={invalidAnnotation.resource}
          {thumbnail}
          {thumbnailError}
          alt={invalidAnnotation.annotationId ?? invalidAnnotation.id}
        />
        <MapRowError
          title={`Map ${mapNumber}`}
          errorTitle="Georeference annotation error"
          errorMessage={invalidAnnotation.message}
        />
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
  {@const organization = showOrganization
    ? getImageEntriesOrganizationSummary([entry])
    : undefined}
  {@const showContainer = !(manifestId || entry.canvas?.id)}
  <section
    class={[
      'space-y-3',
      showContainer &&
        'border p-2 border-gray-200 rounded-2xl bg-gray-100/30 shadow-sm'
    ]}
  >
    <div
      role="button"
      tabindex="0"
      class="flex cursor-pointer items-center justify-between gap-3 rounded"
      onclick={() => uiState.toggleMetadataSectionCollapsed(metadataKey)}
      onkeydown={(event) => handleMetadataHeaderKeydown(event, metadataKey)}
      aria-expanded={!uiState.isMetadataSectionCollapsed(metadataKey)}
    >
      <div class="flex min-w-0 items-center gap-2">
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
        {@render metadataToggle(metadataKey, 'image metadata')}
      </div>
    </div>
    {#if !uiState.isMetadataSectionCollapsed(metadataKey)}
      <Metadata
        resource={canvas}
        uri={getImageInfoUrl(entry.image.resource)}
        uriLabel={getImageServiceId(entry.image.resource)}
        resourceType="image-service"
        label={getActualLabel(entry.canvas)}
        width={entry.image.resource.width}
        height={entry.image.resource.height}
      />
    {/if}
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

  <div
    role="button"
    tabindex="0"
    class="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded"
    onclick={() =>
      metadataKey && uiState.toggleMetadataSectionCollapsed(metadataKey)}
    onkeydown={(event) =>
      metadataKey && handleMetadataHeaderKeydown(event, metadataKey)}
    aria-expanded={metadataKey
      ? !uiState.isMetadataSectionCollapsed(metadataKey)
      : undefined}
  >
    <div class="flex min-w-0 items-center gap-2">
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
        {@render metadataToggle(metadataKey, 'manifest metadata')}
      {/if}
    </div>
  </div>
  {#if metadataKey && !uiState.isMetadataSectionCollapsed(metadataKey)}
    <Metadata
      resource={parsedManifest}
      uri={metadataUri}
      uriLabel={metadataUri}
      resourceType="manifest"
      {label}
    />
  {/if}

  {#each imageEntries as entry (entry.image.resource.id)}
    {@render imageSection(entry, manifestId)}
  {/each}
{/snippet}

{#snippet canvasSection(canvas: MapsByCanvas)}
  {@const imageEntries = getCanvasImageEntries(canvas)}
  {@const title = getTitle(canvas.canvas, 'IIIF Canvas')}
  {@const metadataKey = `canvas:${canvas.canvas.id}`}
  {@const organization = getImageEntriesOrganizationSummary(imageEntries)}
  {#if imageEntries.length === 1}
    {@render imageSection(imageEntries[0], undefined, true)}
  {:else}
    <div
      role="button"
      tabindex="0"
      class="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded focus-visible:outline-2 focus-visible:outline-pink"
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

        {@render metadataToggle(metadataKey, 'canvas metadata')}
      </div>
    </div>
    {#if !uiState.isMetadataSectionCollapsed(metadataKey)}
      <Metadata
        uri={canvas.canvas.id}
        uriLabel={canvas.canvas.id}
        resourceType="canvas"
        label={getActualLabel(canvas.canvas)}
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
  class="max-h-[60vh] overflow-auto space-y-2"
>
  {#if sourceState.source}
    <SourceSummary source={sourceState.source} />
  {/if}
  <div class="space-y-4">
    {#each manifests as manifest (manifest.manifest.id)}
      <section
        class="space-y-3 border p-2 border-gray-200 rounded-2xl bg-gray-100/30 shadow-sm"
      >
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
      {#each canvases as canvas (canvas.canvas.id)}
        <section
          class="space-y-3 border p-2 border-gray-200 rounded-2xl bg-gray-100/30 shadow-sm"
        >
          {@render canvasSection(canvas)}
        </section>
      {/each}
    {/if}

    {#if images.length}
      <section class="space-y-3">
        {@render imageOnlySection(images)}
      </section>
    {/if}
  </div>
</div>
