<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { LngLat } from 'maplibre-gl'
  import type {
    Map as MapLibreMap,
    TransformConstrainFunction
  } from 'maplibre-gl'
  import type { WarpedMapLayer } from '@allmaps/maplibre'
  import { Geocoder, LoadingSmall } from '@allmaps/ui'
  import { SearchGeocoderProvider } from './search-geocoder'
  import type { GeocoderGeoJsonFeature } from '@allmaps/ui/geocoder'
  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { CollageMap } from './model'
  import { SearchPreviews } from './search-previews'
  import type { AdoptSearchPreviews } from './search-previews'
  import { label } from './model'
  import FanMenu from './FanMenu.svelte'
  import type { Point } from '@allmaps/types'
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    Plus,
    Minus,
    X,
    Polygon,
    Circle,
    SelectionAll,
    WarningCircle,
    ArrowsOut,
    MagnifyingGlassPlus
  } from 'phosphor-svelte'
  import {
    cropMap,
    findMaps,
    retainSearchResult,
    resolvePlace,
    searchArea,
    importSearchMap
  } from './map-search'
  import type {
    SearchPlace,
    SearchResult,
    SearchResults,
    ImportMask
  } from './map-search'
  import {
    cameraForCircle,
    circleFrame,
    circleFromCamera,
    constrainCircle,
    circleChanged
  } from './search-camera'
  import type { CircleSelection } from './search-camera'
  import {
    readSearches,
    saveSearch,
    removeSearch,
    searchCache,
    searchKey,
    cacheSearch
  } from './search-session'
  import type { RecentSearch } from './search-session'

  let {
    map,
    layer,
    items,
    apiKey,
    annotationsBase,
    restoreConstrain,
    onadd,
    onclose
  }: {
    map: MapLibreMap
    layer: WarpedMapLayer
    items: CollageMap[]
    apiKey: string
    annotationsBase?: string
    restoreConstrain: TransformConstrainFunction
    onadd: (
      maps: GeoreferencedMap[],
      originalMasks: Point[][],
      adopt: AdoptSearchPreviews
    ) => Promise<void>
    onclose: () => void
  } = $props()

  let providers = $derived([new SearchGeocoderProvider(apiKey)])
  let modal = $state(true)
  let dialog = $state<HTMLDialogElement>()
  let query = $state('')
  let recents = $state.raw<RecentSearch[]>([])
  let entry = $state.raw<RecentSearch>()
  let results = $state.raw<SearchResults>({
    maps: [],
    sources: [],
    skipped: 0,
    excluded: 0,
    limited: false
  })
  let currentId = $state('')
  let importMask = $state<ImportMask>('circle')
  const importOptions = [
    { value: 'circle', label: 'Circle', icon: Circle },
    { value: 'original', label: 'Original mask', icon: Polygon },
    { value: 'full', label: 'Full image', icon: SelectionAll }
  ]
  let loading = $state(false)
  let adding = $state(false)
  let error = $state('')
  let frame = $state.raw(circleFrame(1280, 720))
  let view = $state.raw<CircleSelection>({ center: [0, 0], radius: 250 })
  let previews: SearchPreviews
  let constrainedSource: GeoreferencedMap | undefined
  let controller: AbortController | undefined
  let storage: Storage | undefined
  let active = false
  let disposed = false
  let navigating = false
  let changingCamera = false
  const drafts = new SvelteMap<string, CircleSelection>()
  const chosen = new SvelteMap<string, GeoreferencedMap>()
  const chosenSources = new SvelteMap<string, GeoreferencedMap>()
  const index = $derived(
    results.maps.findIndex((result) => result.id === currentId)
  )
  const current = $derived(results.maps[index])
  const selected = $derived(chosen.has(currentId))
  const title = $derived(current ? label(current.original) : '')
  const captionWidth = $derived(Math.min(264, frame.width - 32))
  const selection = $derived([...chosen.values()])
  const viewChanged = $derived(
    !!entry && circleChanged(view, queryCircle(), frame)
  )

  function persist() {
    if (!entry) return
    entry = { ...entry, current: currentId || entry.current, importMask }
    recents = saveSearch(storage, recents, entry)
  }

  function queryCircle(): CircleSelection {
    return {
      center: [...entry!.place.feature.geometry.coordinates] as [
        number,
        number
      ],
      radius: entry!.meters
    }
  }

  function placeAt(circle: CircleSelection): SearchPlace {
    const place = entry!.place
    return {
      ...place,
      feature: {
        ...place.feature,
        geometry: { type: 'Point', coordinates: circle.center }
      }
    }
  }

  function updateClip() {
    if (!active || modal) return
    map.getCanvas().style.clipPath = `circle(${frame.radius}px at ${frame.x}px ${frame.y}px)`
  }

  function readCamera() {
    const center = map.getCenter()
    return circleFromCamera([center.lng, center.lat], map.getZoom(), frame)
  }

  function cameraMoved() {
    if (!active || modal || changingCamera) return
    view = readCamera()
    if (currentId) drafts.set(currentId, view)
  }

  function selectedMap(result: SearchResult) {
    const circle = drafts.get(result.id) ?? queryCircle()
    try {
      return cropMap(
        result.original,
        searchArea(placeAt(circle), circle.radius)
      )
    } catch (problem) {
      error =
        problem instanceof Error ? problem.message : 'Could not crop this map.'
    }
  }

  function settleCamera() {
    if (changingCamera || disposed) return
    cameraMoved()
    if (current && chosen.has(currentId)) {
      const annotation = selectedMap(current)
      if (annotation) chosen.set(currentId, annotation)
    }
    persist()
  }

  function setView(circle: CircleSelection) {
    changingCamera = true
    map.stop()
    const bounded = constrainedSource
      ? constrainCircle(constrainedSource, circle)
      : circle
    map.jumpTo({
      ...cameraForCircle(bounded, frame),
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      bearing: 0,
      pitch: 0
    })
    changingCamera = false
    cameraMoved()
  }

  function resized() {
    const saved = view
    const canvas = map.getCanvas()
    frame = circleFrame(canvas.clientWidth, canvas.clientHeight)
    updateClip()
    if (active && !modal) setView(saved)
  }

  function preview(result: SearchResult) {
    return previews.ensure(result.id, result.original)
  }

  function show(id: string) {
    if (disposed) return
    const result = results.maps.find((result) => result.id === id)
    if (!result) return
    try {
      const previous = previews.get(currentId)
      if (previous)
        layer.setMapOptions(previous, { visible: false }, { animate: false })
      constrainedSource = result.original
      currentId = id
      const instance = preview(result)
      layer.setMapOptions(
        instance,
        { visible: true, applyMask: false },
        { animate: false }
      )
      updateClip()
      setView(drafts.get(id) ?? queryCircle())
      persist()
      const i = results.maps.indexOf(result)
      previews.retain([
        id,
        results.maps[i - 1]?.id,
        results.maps[i + 1]?.id,
        ...chosen.keys()
      ])
      for (const neighbor of [results.maps[i - 1], results.maps[i + 1]])
        if (neighbor) preview(neighbor)
    } catch (problem) {
      error =
        problem instanceof Error
          ? problem.message
          : 'Could not display this map.'
    }
  }

  function move(delta: number) {
    const result = results.maps[index + delta]
    if (result) {
      map.stop()
      settleCamera()
      navigating = true
      show(result.id)
    }
  }

  function toggle() {
    if (!current || adding) return
    map.stop()
    cameraMoved()
    navigating = true
    if (selected) {
      chosen.delete(currentId)
      chosenSources.delete(currentId)
    } else {
      const annotation = selectedMap(current)
      if (annotation) {
        chosen.set(currentId, annotation)
        chosenSources.set(currentId, current.original)
      } else error = 'This image cannot cover the entire circle.'
    }
  }

  function chooseImportMask(value: string) {
    importMask = value as ImportMask
    persist()
  }

  function receive(next: SearchResults, wanted?: string) {
    results = next
    const id =
      !navigating && next.maps.some((result) => result.id === wanted)
        ? wanted
        : next.maps.some((result) => result.id === currentId)
          ? currentId
          : next.maps[0]?.id
    if (id && id !== currentId) show(id)
    if (!next.maps.length) {
      for (const instance of previews.values())
        layer.setMapOptions(instance, { visible: false }, { animate: false })
      constrainedSource = undefined
      currentId = ''
      updateClip()
    }
  }

  async function start(saved: RecentSearch, refine = false) {
    map.stop()
    settleCamera()
    const retained =
      refine && current
        ? { ...current, map: selectedMap(current) ?? current.map }
        : undefined
    controller?.abort()
    const request = new AbortController()
    controller = request
    entry = structuredClone(saved)
    query = saved.place.query
    modal = false
    error = ''
    loading = true
    if (!refine) {
      chosen.clear()
      chosenSources.clear()
      drafts.clear()
      importMask = saved.importMask ?? 'circle'
    } else {
      // New candidates start at the refined area; the visible map keeps its view.
      drafts.clear()
      if (retained) drafts.set(retained.id, view)
    }
    navigating = false
    previews.retain([retained?.id, ...chosen.keys()])
    const visible = retained && previews.get(retained.id)
    for (const instance of previews.values())
      if (instance !== visible)
        layer.setMapOptions(instance, { visible: false }, { animate: false })
    if (!retained) {
      constrainedSource = undefined
      currentId = ''
    }
    results = retainSearchResult(
      { maps: [], sources: [], skipped: 0, excluded: 0, limited: false },
      retained
    )
    if (!active) {
      for (const item of items)
        layer.setMapOptions(
          item.instanceId,
          { visible: false },
          { animate: false }
        )
      active = true
    }
    updateClip()
    if (!retained) setView(queryCircle())
    const wanted = saved.current
    persist()
    try {
      const cached = searchCache.get(searchKey(saved))
      const found =
        cached ??
        (await findMaps(searchArea(saved.place, saved.meters), {
          signal: request.signal,
          base: annotationsBase,
          onprogress: (next) => {
            if (!request.signal.aborted)
              receive(retainSearchResult(next, retained), wanted)
          }
        }))
      if (request.signal.aborted) return
      const next = retainSearchResult(found, retained)
      receive(next, wanted)
      cacheSearch(saved, next)
      persist()
    } catch (problem) {
      if (!request.signal.aborted)
        error = problem instanceof Error ? problem.message : 'Search failed.'
    } finally {
      if (controller === request) loading = false
    }
  }

  function refine() {
    if (!entry || loading || adding || !viewChanged) return
    map.stop()
    settleCamera()
    const circle = view
    void start(
      {
        ...entry,
        place: placeAt(circle),
        meters: circle.radius,
        current: currentId
      },
      true
    )
  }

  function choose(feature: GeocoderGeoJsonFeature) {
    void start({ place: resolvePlace(feature, query), meters: 250 })
  }

  function resetView() {
    if (entry) {
      setView(queryCircle())
      settleCamera()
    }
  }

  async function add() {
    if (!selection.length || adding) return
    map.stop()
    settleCamera()
    adding = true
    controller?.abort()
    persist()
    try {
      const entries = [...chosen.entries()]
      const ids = entries.map(([id]) => id)
      for (const id of ids) previews.ensure(id, chosenSources.get(id)!)
      await onadd(
        entries.map(([id, map]) =>
          importSearchMap(map, chosenSources.get(id)!, importMask)
        ),
        entries.map(([id]) =>
          structuredClone(chosenSources.get(id)!.resourceMask)
        ),
        (items, update) => previews.adopt(ids, items, update)
      )
    } catch (problem) {
      error = problem instanceof Error ? problem.message : 'Could not add maps.'
    } finally {
      adding = false
    }
  }

  function closeModal() {
    if (!adding) onclose()
  }
  function openDialog(node: HTMLDialogElement) {
    node.showModal()
    const outside = (event: MouseEvent) => {
      if (event.target !== node) return
      const rect = node.getBoundingClientRect()
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        closeModal()
    }
    node.addEventListener('click', outside)
    return { destroy: () => node.removeEventListener('click', outside) }
  }

  function keyboard(event: KeyboardEvent) {
    if (modal || adding || (event.target as HTMLElement)?.closest('input'))
      return
    if (event.key === 'Escape') {
      event.preventDefault()
      onclose()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    } else if (
      event.code === 'Space' &&
      !(event.target as HTMLElement)?.closest('button')
    ) {
      event.preventDefault()
      toggle()
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void add()
    }
  }

  onMount(() => {
    previews = new SearchPreviews(layer)
    const camera = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      padding: map.getPadding()
    }
    const clip = map.getCanvas().style.clipPath
    const visibility = items.map((item) => ({
      id: item.instanceId,
      visible: layer.getWarpedMap(item.instanceId)?.visible ?? true
    }))
    try {
      storage = sessionStorage
    } catch {
      /* Private browsers may disable storage. */
    }
    recents = readSearches(storage)
    map.stop()
    resized()
    map.setTransformConstrain((center, zoom) => {
      if (!active || modal || !constrainedSource)
        return restoreConstrain(center, zoom)
      const circle = circleFromCamera([center.lng, center.lat], zoom, frame)
      const bounded = cameraForCircle(
        constrainCircle(constrainedSource, circle),
        frame
      )
      return { center: new LngLat(...bounded.center), zoom: bounded.zoom }
    })
    const tileError = (event: Event) => {
      const ids = (event as Event & { data?: { mapIds?: string[] } }).data
        ?.mapIds
      if (!ids?.some((id) => previews.hasInstance(id))) return
      error =
        'Some image tiles could not be loaded. Try another result or zoom out.'
    }
    const tileCache = layer.renderer?.tileCache
    tileCache?.addEventListener('tilefetcherror', tileError)
    map.on('move', cameraMoved)
    map.on('moveend', settleCamera)
    map.on('resize', resized)
    return () => {
      disposed = true
      controller?.abort()
      map.off('move', cameraMoved)
      map.off('moveend', settleCamera)
      map.off('resize', resized)
      map.stop()
      constrainedSource = undefined
      map.setTransformConstrain(restoreConstrain)
      map.getCanvas().style.clipPath = clip
      tileCache?.removeEventListener('tilefetcherror', tileError)
      previews.clear()
      for (const item of visibility)
        layer.setMapOptions(
          item.id,
          { visible: item.visible },
          { animate: false }
        )
      map.jumpTo(camera)
    }
  })
</script>

<svelte:window onkeydown={keyboard} />

{#if !modal}
  <svg class="outlines search-aperture" aria-hidden="true">
    <circle cx={frame.x} cy={frame.y} r={frame.radius} class:selected />
  </svg>
{/if}

{#if !modal}
  <section
    class="search-caption"
    aria-live="polite"
    style:left={Math.max(
      16,
      Math.min(frame.x + frame.radius / 2, frame.width - captionWidth - 16)
    ) + 'px'}
    style:top={Math.max(112, frame.y - (frame.radius * Math.sqrt(3)) / 2) +
      'px'}
    style:width={captionWidth + 'px'}
  >
    <h2>{entry?.place.label}</h2>
    {#if current}<p class="search-map-title">{title}</p>{/if}
  </section>
  <div class="bottom-stack search-stack">
    <div
      class="selection-actions search-actions"
      role="group"
      aria-label="Find maps"
    >
      <h2>Find maps</h2>
      <div class="search-control-group">
        <button
          class="quiet-button"
          data-tooltip="Previous map"
          aria-label="Previous map"
          disabled={index <= 0 || adding}
          onclick={() => move(-1)}><ArrowLeft size={19} /></button
        >
        <div class="search-result-status">
          {#if loading || adding}
            <LoadingSmall />
          {:else}
            <span
              role="status"
              aria-label={current
                ? `Map ${index + 1} of ${results.maps.length}`
                : 'No maps'}>{index + 1} / {results.maps.length}</span
            >
          {/if}
        </div>
        <button
          class="quiet-button"
          data-tooltip="Next map"
          aria-label="Next map"
          disabled={index < 0 || index >= results.maps.length - 1 || adding}
          onclick={() => move(1)}><ArrowRight size={19} /></button
        >
        <button
          class="quiet-button"
          data-tooltip="Refine search"
          aria-label="Refine search"
          disabled={loading || adding || !viewChanged}
          onclick={refine}><MagnifyingGlassPlus size={19} /></button
        >
        <FanMenu
          label="Import shape"
          value={importMask}
          options={importOptions}
          disabled={adding}
          onselect={chooseImportMask}
        />
        {#if error}<span
            class="search-error"
            role="img"
            aria-label={error}
            title={error}><WarningCircle size={20} /></span
          >{/if}
      </div>
      <div class="search-control-group">
        <button
          class="quiet-button search-text-button search-select"
          class:chosen={selected}
          data-tooltip={selected ? 'Remove from selection' : 'Add to selection'}
          aria-label={selected ? 'Remove from selection' : 'Add to selection'}
          aria-pressed={selected}
          disabled={!current || adding}
          onclick={toggle}
          >{#if selected}<Minus size={19} />{:else}<Plus size={19} />{/if}
          <span>{selected ? 'Remove' : 'Add'}</span></button
        >
        <button
          class="quiet-button search-confirm"
          data-tooltip="Confirm selection"
          aria-label={`Confirm selection (${selection.length})`}
          disabled={!selection.length || adding}
          onclick={add}
          ><Check size={19} />{#if selection.length}<span
              class="search-count"
              aria-hidden="true">{selection.length}</span
            >{/if}</button
        >
        <button
          class="quiet-button"
          data-tooltip="Cancel"
          aria-label="Cancel search"
          disabled={adding}
          onclick={onclose}><X size={19} /></button
        >
      </div>
    </div>
  </div>
  <footer class="canvas-footer search-footer">
    <div class="view-controls">
      <button
        aria-label="Zoom in"
        data-tooltip="Zoom in"
        onclick={() => map.zoomIn()}><Plus size={19} /></button
      >
      <button
        aria-label="Zoom out"
        data-tooltip="Zoom out"
        onclick={() => map.zoomOut()}><Minus size={19} /></button
      >
      <button
        aria-label="Reset search view"
        data-tooltip="Reset search view"
        disabled={!current}
        onclick={resetView}><ArrowsOut size={19} /></button
      >
    </div>
  </footer>
{/if}

{#if modal}
  <dialog
    bind:this={dialog}
    class="input-dialog search-dialog"
    use:openDialog
    aria-labelledby="search-title"
    oncancel={(event) => {
      event.preventDefault()
      closeModal()
    }}
  >
    <button
      class="close-dialog"
      aria-label="Close place search"
      onclick={closeModal}><X size={22} /></button
    >
    <h2 id="search-title">Find maps</h2>
    <Geocoder
      {providers}
      bind:inputValue={query}
      portalTarget={dialog}
      placeholder="Place or latitude, longitude"
      onselect={(event) => choose(event.detail)}
    />
    {#if error}<p class="dialog-error" role="alert">{error}</p>{/if}
    {#if recents.length}
      <div class="recent-searches" aria-label="Recent searches">
        {#each recents as recent (searchKey(recent))}
          <div class="recent-search-row">
            <button onclick={() => start(recent)}
              ><span>{recent.place.label}</span><span
                >{Math.round(recent.meters)} m</span
              ></button
            >
            <button
              class="remove-search"
              aria-label={`Remove search: ${recent.place.label} (${Math.round(recent.meters)} m)`}
              data-tooltip="Remove recent search"
              onclick={() => (recents = removeSearch(storage, recents, recent))}
              ><X size={18} /></button
            >
          </div>
        {/each}
      </div>
    {/if}
    {#if apiKey}<a
        class="geocoder-credit"
        href="https://geocode.earth"
        target="_blank"
        rel="noreferrer">Search by Geocode Earth</a
      >
    {:else}<p class="geocoder-credit">
        Enter coordinates, or configure PUBLIC_GEOCODE_EARTH_KEY to search
        places.
      </p>{/if}
  </dialog>
{/if}
