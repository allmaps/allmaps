<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { Map as MapLibreMap, LngLat } from 'maplibre-gl'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { lonLatToWebMercator, webMercatorToLonLat } from '@allmaps/project'
  import { Logo, BringMapsToFront, SendMapsToBack } from '@allmaps/ui'
  import { themeColors, shades } from '@allmaps/tailwind'
  import MapControl from './MapControl.svelte'
  import MaskEditor from './MaskEditor.svelte'
  import { updateLoadFailures } from './load-status'
  import type { LoadFailures } from './load-status'
  import BackgroundWorker from './background.worker.ts?worker'
  import type { BackgroundRequest } from './background.worker'
  import {
    Plus,
    Minus,
    FolderOpen,
    DownloadSimple,
    ArrowsOut,
    ArrowsOutCardinal,
    ArrowClockwise,
    X,
    UploadSimple,
    ArrowUUpLeft,
    ArrowUUpRight,
    Trash,
    CircleHalf,
    Palette,
    DropHalf,
    MagicWand,
    Selection,
    Polygon,
    Spiral,
    Copy
  } from 'phosphor-svelte'
  import {
    addMaps,
    openCollage,
    exportCollage,
    placedMap,
    outline,
    mapCenter,
    contains,
    originalAnnotationUrl,
    parseMaps,
    resetRotationFromOriginal,
    rotatePlacement,
    arrangeMaps,
    duplicateMaps,
    setResourceMask,
    resolveImageSize,
    center
  } from './model'
  import type { CollageMap, Placement } from './model'
  import type { Point } from '@allmaps/types'
  import {
    controlLayout,
    railValue,
    hueColor,
    radiusForSize,
    fitControlCenter,
    preferredControlCenter
  } from './control-layout'
  import { bounds, clipPolygon, visibleCenter } from './geometry'
  import type { Control, ControlPosition, Rail, Slider } from './control-layout'

  let container: HTMLDivElement
  let fileInput = $state<HTMLInputElement>()
  let textInput = $state<HTMLTextAreaElement>()
  let map = $state.raw<MapLibreMap>()
  let layer = $state.raw<WarpedMapLayer>()
  let ready = $state(false)
  let busy = $state(false)
  let items = $state.raw<CollageMap[]>([])
  let selectedIds = $state.raw<Set<string>>(new Set())
  const selection = $derived(
    items.filter((item) => selectedIds.has(item.instanceId))
  )
  const selected = $derived(selection[0])
  const selectedRotation = $derived(selection[0]?.placement.rotation ?? 0)
  let overlays = $state.raw<{ id: string; points: string }[]>([])
  let loadFailures = $state.raw<LoadFailures>({})
  type DragMode = 'move' | 'rotate' | Slider
  let controls = $state.raw<Record<Control, ControlPosition>>()
  let activeControl = $state<DragMode>()
  const appearances = $derived(selection[0]?.appearance)
  let controlCenter: Point | undefined
  let controlRadius = 184
  let editingMask = $state.raw<CollageMap>()
  let marquee = $state.raw<{
    start: Point
    end: Point
    before: Set<string>
    pointerId: number
  }>()
  let backgroundWorker: Worker | undefined
  let inputMode = $state<'add' | 'open'>()
  let inputText = $state('')
  let errorMessage = $state('')
  let message = $state('All places. One scale.')
  let draggingOver = $state(false)
  let past = $state.raw<CollageMap[][]>([])
  let future = $state.raw<CollageMap[][]>([])
  let spaceDown = false
  let sendToBack = $state(false)
  let frame: number | undefined
  let latestPointer: PointerEvent | undefined
  let disposed = false
  let drag:
    | {
        targets: {
          item: CollageMap
          start: Placement
          appearance: CollageMap['appearance']
        }[]
        pivot: Point
        controlPivot: Point
        anchor: Point
        rotation: number
        mode: DragMode
        rail?: Rail
        startRailValue: number
        pointer: Point
        angle: number
        before: CollageMap[]
        outlineOnly: boolean
        pointerId: number
      }
    | undefined

  function fail(error: unknown) {
    errorMessage = error instanceof Error ? error.message : String(error)
  }

  function trackLoad(event: Event, failed: boolean, kind: 'image' | 'tile') {
    const data = (
      event as Event & {
        data?: { mapIds?: string[]; imageId?: string; tileUrl?: string }
      }
    ).data
    const ids =
      data?.mapIds ??
      items
        .filter((item) => item.baseline.resource.id === data?.imageId)
        .map((item) => item.instanceId)
    const resource = kind === 'image' ? 'image-info' : data?.tileUrl
    if (resource)
      loadFailures = updateLoadFailures(loadFailures, ids, resource, failed)
  }

  function remember(before = structuredClone(items)) {
    past = [...past.slice(-39), before]
    future = []
  }

  function projectedOutline(item: CollageMap): Point[] {
    return outline(item).map((point) => {
      const screen = map!.project(webMercatorToLonLat(point))
      return [screen.x, screen.y]
    })
  }

  function refresh() {
    if (!map) return
    const polygons = items.map((item) => ({
      id: item.instanceId,
      points: projectedOutline(item)
    }))
    overlays = polygons.map(({ id, points }) => ({
      id,
      points: points.map((p) => p.join(',')).join(' ')
    }))
    const targets = items.filter((item) => selectedIds.has(item.instanceId))
    if (!targets.length) {
      controls = undefined
      controlCenter = undefined
      return
    }
    const selectedPolygons = polygons
      .filter((p) => selectedIds.has(p.id))
      .map((p) => p.points)
    const viewport: [number, number, number, number] = [
      0,
      0,
      container.clientWidth,
      container.clientHeight
    ]
    const visible = visibleCenter(selectedPolygons, viewport)
    if (!visible && !drag) {
      controls = undefined
      controlCenter = undefined
      return
    }
    if (drag) {
      const anchor = map.project(webMercatorToLonLat(drag.anchor))
      controlCenter = [anchor.x, anchor.y]
    } else {
      const pivot = selectionPivot(targets)
      const screen = map.project(webMercatorToLonLat(pivot))
      const points = selectedPolygons.flat()
      // Only camera zoom and the full map size drive docking. Clipping does
      // not move the anchor around as different fragments enter the viewport.
      const diameter =
        2 *
        Math.max(
          ...points.map(([x, y]) => Math.hypot(x - screen.x, y - screen.y))
        )
      controlRadius = radiusForSize(diameter)
      controlCenter = preferredControlCenter([screen.x, screen.y], diameter, [
        viewport[2],
        viewport[3]
      ])
    }
    const layout = controlLayout(
      controlCenter,
      targets[0].placement.rotation,
      targets[0].appearance,
      controlRadius
    )
    controlCenter = fitControlCenter(
      controlCenter,
      layout,
      [viewport[2], viewport[3]],
      targets.length > 1
    )
    controls = controlLayout(
      controlCenter,
      targets[0].placement.rotation,
      targets[0].appearance,
      controlRadius
    )
  }

  function selectionPivot(targets = selection): Point {
    return targets
      .map(mapCenter)
      .reduce<Point>(
        (sum, point) => [
          sum[0] + point[0] / targets.length,
          sum[1] + point[1] / targets.length
        ],
        [0, 0]
      )
  }

  function select(ids: string[] = []) {
    selectedIds = new Set(ids)
    refresh()
  }

  function screenPoint(event: PointerEvent): Point {
    const rect = container.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function worldAt(screen: Point): Point {
    const point = map!.unproject(screen)
    return lonLatToWebMercator([point.lng, point.lat])
  }

  function worldPoint(event: PointerEvent): Point {
    const bounds = container.getBoundingClientRect()
    const point = map!.unproject([
      event.clientX - bounds.left,
      event.clientY - bounds.top
    ])
    return lonLatToWebMercator([point.lng, point.lat])
  }

  function updateRaster(item: CollageMap) {
    layer!.setMapGcps(item.instanceId, placedMap(item).gcps, { animate: false })
  }

  function fit() {
    if (!map || !items.length) return
    const points = items
      .flatMap(outline)
      .map((point) => webMercatorToLonLat(point))
    map.fitBounds(
      [
        [
          Math.min(...points.map((p) => p[0])),
          Math.min(...points.map((p) => p[1]))
        ],
        [
          Math.max(...points.map((p) => p[0])),
          Math.max(...points.map((p) => p[1]))
        ]
      ],
      {
        padding: { top: 160, bottom: 100, left: 70, right: 70 },
        maxZoom: 18,
        duration: 350
      }
    )
  }

  function updateAppearance(item: CollageMap) {
    const appearance = item.appearance
    layer!.setMapOptions(
      item.instanceId,
      {
        applyMask: appearance.applyMask,
        opacity: appearance.opacity,
        saturation: appearance.saturation,
        colorize: appearance.colorize,
        colorizeColor: hueColor(appearance.hue),
        removeColor:
          appearance.removeBackground && !!appearance.backgroundColor,
        removeColorColor: appearance.backgroundColor ?? '#ffffff',
        removeColorHardness: 0.1,
        removeColorThreshold: appearance.removeBackground ? 1 / 3 : 0
      },
      { animate: false }
    )
  }

  function renderItem(item: CollageMap) {
    layer!.addGeoreferencedMap({ ...placedMap(item), id: item.instanceId })
    updateAppearance(item)
  }

  function changeOrder(toFront: boolean) {
    if (!selection.length || busy || drag) return
    const rest = items.filter((item) => !selectedIds.has(item.instanceId))
    const next = toFront ? [...rest, ...selection] : [...selection, ...rest]
    if (next.every((item, i) => item === items[i])) return
    remember()
    items = next
    layer!.bringMapsToFront(items.map((item) => item.instanceId))
    refresh()
  }

  function duplicate() {
    if (!selection.length || busy || drag || !map) return
    const added: CollageMap[] = []
    try {
      const from = worldAt([
        container.clientWidth / 2,
        container.clientHeight / 2
      ])
      const to = worldAt([
        container.clientWidth / 2 + 24,
        container.clientHeight / 2 + 24
      ])
      const extent = bounds(selection.flatMap(outline))
      const limit = Math.max(extent[2] - extent[0], extent[3] - extent[1]) * 0.1
      const factor = Math.min(
        1,
        limit / Math.hypot(to[0] - from[0], to[1] - from[1])
      )
      const copies = duplicateMaps(selection, [
        (to[0] - from[0]) * factor,
        (to[1] - from[1]) * factor
      ])
      for (const copy of copies) {
        added.push(copy)
        renderItem(copy)
      }
      remember()
      items = [...items, ...copies]
      select(copies.map((copy) => copy.instanceId))
      message =
        copies.length === 1 ? 'Map duplicated.' : 'Selected maps duplicated.'
    } catch (error) {
      for (const item of added)
        layer!.removeGeoreferencedMapById(item.instanceId)
      fail(error)
    }
  }

  function organize() {
    if (selection.length < 2 || busy || drag) return
    const before = structuredClone(items)
    const at = center(selection.flatMap(outline))
    try {
      arrangeMaps(selection, at, container.clientWidth / container.clientHeight)
      selection.forEach(placedMap)
      selection.forEach(updateRaster)
      remember(before)
      items = [...items]
      refresh()
    } catch (error) {
      restore(before)
      fail(error)
    }
  }

  function toggleMask() {
    if (selection.length !== 1 || busy || drag) return
    const item = selected!
    const before = structuredClone(items)
    try {
      ensureImageSize(item)
      item.appearance = {
        ...item.appearance,
        applyMask: !item.appearance.applyMask
      }
      updateAppearance(item)
      remember(before)
      items = [...items]
      refresh()
    } catch (error) {
      restore(before)
      fail(error)
    }
  }

  function editMask() {
    if (selection.length !== 1 || busy || drag) return
    errorMessage = ''
    try {
      ensureImageSize(selected!)
      map?.stop()
      editingMask = selected
    } catch (error) {
      fail(error)
    }
  }

  function ensureImageSize(item: CollageMap) {
    if (item.baseline.resource.width && item.baseline.resource.height) return
    const image = layer!.getWarpedMap(item.instanceId)?.image
    if (!image)
      throw new Error('The image is still loading. Try again in a moment.')
    resolveImageSize(item, image.width, image.height)
  }

  function saveMask(mask: Point[]) {
    const item = editingMask
    if (!item) return
    if (JSON.stringify(mask) === JSON.stringify(item.resourceMask)) {
      editingMask = undefined
      return
    }
    const before = structuredClone(items)
    try {
      setResourceMask(item, mask)
      layer!.setMapResourceMask(item.instanceId, item.resourceMask, {
        animate: false
      })
      remember(before)
      items = [...items]
      editingMask = undefined
      refresh()
    } catch (error) {
      editingMask = undefined
      restore(before)
      fail(error)
    }
  }

  async function toggleBackground() {
    const item = selected
    if (!item || busy || drag) return
    busy = true
    errorMessage = ''
    try {
      let color = item.appearance.backgroundColor
      if (!color) {
        const image = layer!.getWarpedMap(item.instanceId)?.image
        if (!image)
          throw new Error('The image is still loading. Try again in a moment.')
        const request = image.getImageRequest({ width: 512, height: 512 })
        const rows = (Array.isArray(request) ? request : [[request]]).map(
          (row) =>
            row.map((tile) => ({
              url: image.getImageUrl(tile, {
                preferredFormats: ['webp', 'jpg']
              })
            }))
        )
        const worker = new BackgroundWorker()
        backgroundWorker = worker
        try {
          color = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('Background detection timed out.')),
              20000
            )
            worker.onmessage = ({ data }) => {
              clearTimeout(timeout)
              if (data.error) reject(new Error(data.error))
              else resolve(data.color)
            }
            worker.onerror = () => {
              clearTimeout(timeout)
              reject(new Error('Could not detect the map background.'))
            }
            worker.postMessage({
              resourceSize: [image.width, image.height],
              mask: item.resourceMask,
              rows
            } satisfies BackgroundRequest)
          })
        } finally {
          worker.terminate()
          backgroundWorker = undefined
        }
      }
      if (disposed || !items.includes(item)) return
      remember()
      item.appearance = {
        ...item.appearance,
        backgroundColor: color,
        removeBackground: !item.appearance.removeBackground
      }
      updateAppearance(item)
      items = [...items]
    } catch (error) {
      fail(error)
    } finally {
      busy = false
    }
  }

  function install(next: CollageMap[], replace: boolean) {
    const added: CollageMap[] = []
    try {
      for (const item of next) {
        renderItem(item)
        added.push(item)
      }
    } catch (error) {
      for (const item of added)
        layer!.removeGeoreferencedMapById(item.instanceId)
      throw error
    }
    remember()
    if (replace) {
      for (const item of items)
        layer!.removeGeoreferencedMapById(item.instanceId)
    }
    items = replace ? next : [...items, ...next]
    select()
    inputMode = undefined
    fit()
    message = replace
      ? 'Collage opened. Its coordinates and layer order are preserved.'
      : next.length +
        (next.length === 1 ? ' map added' : ' maps added') +
        ' at a shared ground scale.'
  }

  async function fetchJson(url: string) {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol))
      throw new Error('Use an HTTP or HTTPS annotation URL.')
    const response = await fetch(parsed, {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store'
    })
    if (!response.ok)
      throw new Error(
        'Could not load annotation (HTTP ' + response.status + ').'
      )
    return response.json()
  }

  function prepare(input: unknown, mode: 'add' | 'open', sourceUrl?: string) {
    const center = map!.getCenter()
    return mode === 'open'
      ? openCollage(input)
      : addMaps(
          input,
          lonLatToWebMercator([center.lng, center.lat] as Point),
          sourceUrl,
          container.clientWidth / container.clientHeight
        )
  }

  async function submit(event?: SubmitEvent) {
    event?.preventDefault()
    if (!ready || busy || !inputMode) return
    busy = true
    errorMessage = ''
    try {
      const value = inputText.trim()
      if (!value) throw new Error('Paste an annotation URL or JSON.')
      const isJson = value.startsWith('{') || value.startsWith('[')
      const input = isJson ? JSON.parse(value) : await fetchJson(value)
      if (disposed) return
      install(
        prepare(input, inputMode, isJson ? undefined : value),
        inputMode === 'open'
      )
    } catch (error) {
      fail(error)
    } finally {
      busy = false
    }
  }

  async function files(files: File[], mode: 'add' | 'open') {
    if (!ready || busy || !files.length) return
    busy = true
    errorMessage = ''
    try {
      if (mode === 'open' && files.length > 1)
        throw new Error('Open one collage file at a time.')
      const inputs = await Promise.all(
        files.map(async (file) => JSON.parse(await file.text()))
      )
      if (disposed) return
      // Flatten files into a single batch so all their maps are placed together.
      const document =
        inputs.length === 1
          ? inputs[0]
          : {
              type: 'AnnotationPage',
              items: inputs.flatMap(
                (input) => exportCollage(openCollage(input)).items
              )
            }
      install(prepare(document, mode), mode === 'open')
    } catch (error) {
      fail(error)
    } finally {
      busy = false
    }
  }

  async function showInput(mode: 'add' | 'open') {
    inputMode = mode
    inputText = ''
    errorMessage = ''
    await tick()
    textInput?.focus()
  }

  function showDialog(node: HTMLDialogElement) {
    node.showModal()
    let downOutside = false
    const outside = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
    }
    const down = (event: PointerEvent) => {
      downOutside = outside(event)
    }
    const up = (event: PointerEvent) => {
      if (downOutside && outside(event) && !busy) inputMode = undefined
      downOutside = false
    }
    node.addEventListener('pointerdown', down)
    node.addEventListener('pointerup', up)
    return {
      destroy: () => {
        node.removeEventListener('pointerdown', down)
        node.removeEventListener('pointerup', up)
        node.close()
      }
    }
  }

  async function example() {
    if (!ready || busy) return
    busy = true
    errorMessage = ''
    try {
      const documents = await Promise.all(
        Array.from({ length: 3 }, () =>
          fetchJson('https://annotations.allmaps.org/maps/random')
        )
      )
      if (disposed) return
      const maps = documents.flatMap(
        (document) => exportCollage(openCollage(document)).items
      )
      install(prepare({ type: 'AnnotationPage', items: maps }, 'add'), false)
    } catch (error) {
      fail(error)
    } finally {
      busy = false
    }
  }

  function save() {
    try {
      const data = JSON.stringify(exportCollage(items), null, 2)
      const url = URL.createObjectURL(
        new Blob([data], { type: 'application/ld+json' })
      )
      const a = document.createElement('a')
      a.href = url
      a.download = 'allmaps-collage.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      message = 'Annotation saved. Use Open collage to restore this layout.'
    } catch (error) {
      fail(error)
    }
  }

  function restore(next: CollageMap[]) {
    const currentIds = new Set(items.map((item) => item.instanceId))
    const nextIds = new Set(next.map((item) => item.instanceId))
    // Keep unchanged renderer instances and their image/tile caches alive.
    // Clearing the renderer and immediately reusing IDs can strand its tiles.
    for (const item of items) {
      if (!nextIds.has(item.instanceId))
        layer!.removeGeoreferencedMapById(item.instanceId)
    }
    for (const item of next) {
      if (currentIds.has(item.instanceId)) {
        updateRaster(item)
        layer!.setMapResourceMask(item.instanceId, item.resourceMask, {
          animate: false
        })
        updateAppearance(item)
      } else renderItem(item)
    }
    layer!.bringMapsToFront(next.map((item) => item.instanceId))
    items = next
    select(
      items
        .filter((item) => selectedIds.has(item.instanceId))
        .map((item) => item.instanceId)
    )
  }

  function undo() {
    if (!past.length || drag || busy) return
    const next = past.at(-1)!
    future = [...future, structuredClone(items)]
    past = past.slice(0, -1)
    restore(next)
  }

  function redo() {
    if (!future.length || drag || busy) return
    const next = future.at(-1)!
    past = [...past, structuredClone(items)]
    future = future.slice(0, -1)
    restore(next)
  }

  function removeSelected() {
    if (!selection.length || drag || busy) return
    remember()
    for (const item of selection)
      layer!.removeGeoreferencedMapById(item.instanceId)
    items = items.filter((item) => !selectedIds.has(item.instanceId))
    select()
  }

  function toggleSaturation() {
    if (!selected || busy || drag) return
    remember()
    selected.appearance = {
      ...selected.appearance,
      saturation: selected.appearance.saturation ? 0 : 1
    }
    updateAppearance(selected)
    items = [...items]
  }

  function toggleColorize() {
    if (!selected || busy || drag) return
    remember()
    selected.appearance = {
      ...selected.appearance,
      colorize: !selected.appearance.colorize
    }
    updateAppearance(selected)
    items = [...items]
  }

  function controlKey(event: KeyboardEvent, mode: 'rotate' | Slider) {
    if (!selected || busy || drag) return
    if (mode === 'hue' && ['Enter', ' '].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      toggleColorize()
      return
    }
    const direction = ['ArrowRight', 'ArrowUp'].includes(event.key)
      ? 1
      : ['ArrowLeft', 'ArrowDown'].includes(event.key)
        ? -1
        : 0
    if (
      !direction &&
      (mode === 'rotate' || !['Home', 'End'].includes(event.key))
    )
      return
    event.preventDefault()
    remember()
    if (mode === 'rotate') {
      const pivot = selectionPivot()
      const angle = (direction * (event.shiftKey ? 15 : 1) * Math.PI) / 180
      const previous = selection.map((item) => structuredClone(item.placement))
      try {
        selection.forEach((item) => {
          item.placement = rotatePlacement(item.placement, pivot, angle)
        })
        selection.forEach(placedMap)
        selection.forEach(updateRaster)
      } catch (error) {
        selection.forEach((item, i) => {
          item.placement = previous[i]
          updateRaster(item)
        })
        past = past.slice(0, -1)
        fail(error)
      }
    } else {
      const value =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? 1
            : Math.max(
                0,
                Math.min(
                  1,
                  selected.appearance[mode] +
                    direction * (mode === 'hue' ? 1 / 36 : 0.05)
                )
              )
      selected.appearance = {
        ...selected.appearance,
        [mode]: value,
        ...(mode === 'hue' ? { colorize: true } : {})
      }
      updateAppearance(selected)
    }
    items = [...items]
    refresh()
  }

  async function resetOrientation() {
    const item = selected
    if (!item || busy) return
    busy = true
    errorMessage = ''
    let reset = item.resetRotation
    const url = originalAnnotationUrl(item.baseline)
    if (url) {
      try {
        const originals = parseMaps(await fetchJson(url))
        const original =
          originals.find(
            (candidate) =>
              candidate.id === url &&
              candidate.resource.id === item.baseline.resource.id
          ) ??
          originals.find(
            (candidate) =>
              candidate.resource.id === item.baseline.resource.id &&
              candidate.gcps.every((gcp) =>
                item.baseline.gcps.some(
                  (loaded) =>
                    loaded.resource[0] === gcp.resource[0] &&
                    loaded.resource[1] === gcp.resource[1]
                )
              )
          )
        if (!original) throw new Error('Original map not found.')
        reset = resetRotationFromOriginal(item, original)
        message = 'Original orientation restored.'
      } catch {
        message =
          'Original annotation unavailable. Using the loaded orientation.'
      }
    } else {
      message = 'Loaded orientation restored.'
    }
    if (!disposed && items.includes(item)) {
      const before = structuredClone(items)
      const previous = item.placement.rotation
      item.placement.rotation = reset
      try {
        updateRaster(item)
        remember(before)
        items = [...items]
        refresh()
      } catch (error) {
        item.placement.rotation = previous
        fail(error)
      }
    }
    busy = false
  }

  function beginDrag(event: PointerEvent, item: CollageMap, mode: DragMode) {
    if (busy || drag || marquee || event.button !== 0 || !map) return
    event.preventDefault()
    event.stopPropagation()
    if (!selectedIds.has(item.instanceId)) select([item.instanceId])
    const targets = items.filter((candidate) =>
      selectedIds.has(candidate.instanceId)
    )
    const pointer = worldPoint(event)
    const screen = screenPoint(event)
    const pivot = selectionPivot(targets)
    const controlPivot = controlCenter ? worldAt(controlCenter) : pivot
    const rail = controls?.[mode].rail
    drag = {
      targets: targets.map((item) => ({
        item,
        start: structuredClone(item.placement),
        appearance: structuredClone(item.appearance)
      })),
      pivot,
      controlPivot,
      anchor: controlPivot,
      rotation: 0,
      mode,
      pointer,
      rail,
      startRailValue: rail ? railValue(screen, rail) : 0,
      angle: Math.atan2(
        pointer[1] - controlPivot[1],
        pointer[0] - controlPivot[0]
      ),
      before: structuredClone(items),
      outlineOnly: false,
      pointerId: event.pointerId
    }
    activeControl = mode
    map.dragPan.disable()
    map.getCanvas().style.cursor = mode === 'move' ? 'grabbing' : 'crosshair'
    ;(event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId)
  }

  function pointerDown(event: PointerEvent) {
    if (
      !ready ||
      busy ||
      drag ||
      marquee ||
      spaceDown ||
      event.button !== 0 ||
      inputMode ||
      editingMask
    )
      return
    const point = worldPoint(event)
    const item = [...items]
      .reverse()
      .find((item) => contains(point, outline(item)))
    const additive = event.shiftKey || event.metaKey || event.ctrlKey
    if (item) {
      if (additive) {
        event.preventDefault()
        event.stopPropagation()
        const ids = new Set(selectedIds)
        if (ids.has(item.instanceId)) ids.delete(item.instanceId)
        else ids.add(item.instanceId)
        select([...ids])
      } else beginDrag(event, item, 'move')
    } else if (additive) {
      event.preventDefault()
      event.stopPropagation()
      const start = screenPoint(event)
      marquee = {
        start,
        end: start,
        before: new Set(selectedIds),
        pointerId: event.pointerId
      }
      map!.dragPan.disable()
      map!.getCanvas().setPointerCapture(event.pointerId)
    } else select()
  }

  function updateDrag(event: PointerEvent) {
    if (!drag) return
    const point = worldPoint(event)
    const screen = screenPoint(event)
    if (drag.mode === 'opacity' || drag.mode === 'hue') {
      const { item, appearance } = drag.targets[0]
      const value = Math.max(
        0,
        Math.min(
          1,
          appearance[drag.mode] +
            railValue(screen, drag.rail!) -
            drag.startRailValue
        )
      )
      const changed = Math.abs(value - appearance[drag.mode]) > 0.0001
      item.appearance = {
        ...item.appearance,
        [drag.mode]: value,
        ...(drag.mode === 'hue' && changed ? { colorize: true } : {})
      }
      updateAppearance(item)
      items = [...items]
      refresh()
      return
    }
    const gesture = drag
    const previous = gesture.targets.map(({ item }) =>
      structuredClone(item.placement)
    )
    if (gesture.mode === 'move') {
      const delta: Point = [
        point[0] - gesture.pointer[0],
        point[1] - gesture.pointer[1]
      ]
      gesture.targets.forEach(({ item, start }) => {
        item.placement = {
          ...start,
          position: [start.position[0] + delta[0], start.position[1] + delta[1]]
        }
      })
      gesture.anchor = [
        gesture.controlPivot[0] + delta[0],
        gesture.controlPivot[1] + delta[1]
      ]
    } else {
      const angle = Math.atan2(
        point[1] - gesture.controlPivot[1],
        point[0] - gesture.controlPivot[0]
      )
      gesture.rotation += Math.atan2(
        Math.sin(angle - gesture.angle),
        Math.cos(angle - gesture.angle)
      )
      gesture.angle = angle
      const startAngle = gesture.targets[0].start.rotation
      const delta = event.shiftKey
        ? (Math.round((startAngle + gesture.rotation) / (Math.PI / 12)) *
            Math.PI) /
            12 -
          startAngle
        : gesture.rotation
      gesture.targets.forEach(({ item, start }) => {
        item.placement = rotatePlacement(start, gesture.pivot, delta)
      })
    }
    try {
      gesture.targets.forEach(({ item }) => placedMap(item))
      if (!gesture.outlineOnly) {
        const start = performance.now()
        gesture.targets.forEach(({ item }) => updateRaster(item))
        if (performance.now() - start > 32) {
          gesture.outlineOnly = true
          gesture.targets.forEach(({ item, start }) => {
            const placement = item.placement
            try {
              item.placement = start
              updateRaster(item)
            } finally {
              item.placement = placement
            }
          })
          message = 'Using an outline preview for this gesture.'
        }
      }
    } catch (error) {
      gesture.targets.forEach(({ item }, i) => {
        item.placement = previous[i]
      })
      fail(error)
    }
    items = [...items]
    refresh()
  }

  function pointerMove(event: PointerEvent) {
    sendToBack = event.altKey
    if (marquee?.pointerId === event.pointerId) {
      marquee = { ...marquee, end: screenPoint(event) }
      return
    }
    if (!drag || drag.pointerId !== event.pointerId) return
    latestPointer = event
    if (frame !== undefined) return
    frame = requestAnimationFrame(() => {
      frame = undefined
      if (latestPointer) updateDrag(latestPointer)
    })
  }

  function finishDrag(event?: PointerEvent, cancel = false) {
    if (marquee && (!event || event.pointerId === marquee.pointerId)) {
      if (!cancel) {
        const rect = bounds([
          marquee.start,
          event ? screenPoint(event) : marquee.end
        ])
        const ids = new Set(marquee.before)
        if (rect[2] - rect[0] > 3 || rect[3] - rect[1] > 3) {
          for (const item of items) {
            if (clipPolygon(projectedOutline(item), rect).length >= 3)
              ids.add(item.instanceId)
          }
        }
        select([...ids])
      }
      marquee = undefined
      map?.dragPan.enable()
      return
    }
    if (!drag || (event && event.pointerId !== drag.pointerId)) return
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    if (event && !cancel) updateDrag(event)
    const completed = drag
    drag = undefined
    activeControl = undefined
    latestPointer = undefined
    const rollback = () =>
      completed.targets.forEach(({ item, start, appearance }) => {
        item.placement = start
        item.appearance = appearance
      })
    if (cancel) rollback()
    try {
      completed.targets.forEach(({ item }) => {
        updateRaster(item)
        updateAppearance(item)
      })
      if (
        !cancel &&
        completed.targets.some(
          ({ item, start, appearance }) =>
            JSON.stringify(start) !== JSON.stringify(item.placement) ||
            JSON.stringify(appearance) !== JSON.stringify(item.appearance)
        )
      )
        remember(completed.before)
    } catch (error) {
      rollback()
      completed.targets.forEach(({ item }) => {
        updateRaster(item)
        updateAppearance(item)
      })
      fail(error)
    }
    items = [...items]
    map?.dragPan.enable()
    if (map) map.getCanvas().style.cursor = ''
    refresh()
  }

  function keyboard(event: KeyboardEvent) {
    sendToBack = event.altKey
    if (editingMask) return
    if (event.key === 'Escape') {
      if (drag || marquee) finishDrag(undefined, true)
      else if (!busy) {
        inputMode = undefined
        select()
      }
      return
    }
    if (
      (event.target as HTMLElement)?.closest(
        'input, textarea, [contenteditable="true"]'
      ) ||
      inputMode
    )
      return
    if (
      event.code === 'Space' &&
      !(event.target as HTMLElement)?.closest('button')
    ) {
      spaceDown = true
      event.preventDefault()
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      if (!drag && !marquee && !busy)
        select(items.map((item) => item.instanceId))
    } else if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'z'
    ) {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    } else if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 's'
    ) {
      event.preventDefault()
      save()
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      removeSelected()
    }
  }

  async function drop(event: DragEvent) {
    event.preventDefault()
    draggingOver = false
    if (busy || !ready || drag || editingMask) return
    const droppedFiles = Array.from(event.dataTransfer?.files ?? [])
    if (droppedFiles.length) await files(droppedFiles, inputMode ?? 'add')
    else {
      const url =
        (event.dataTransfer?.getData('text/uri-list') ?? '')
          .split(/\r?\n/)
          .find((line) => line.trim() && !line.startsWith('#')) ??
        event.dataTransfer?.getData('text/plain')
      if (url) {
        inputMode ??= 'add'
        inputText = url.trim()
        await submit()
      }
    }
  }

  onMount(() => {
    try {
      map = new MapLibreMap({
        container,
        style: { version: 8, sources: {}, layers: [] },
        center: [0, 0],
        zoom: 13,
        minZoom: -2,
        maxPitch: 0,
        maxZoom: 22,
        renderWorldCopies: false,
        // Keep a finite Mercator center while allowing the viewport to extend
        // beyond the world rectangle, instead of forcing it to fill the screen.
        transformConstrain: (center, zoom) => ({
          center: new LngLat(
            Math.max(-180, Math.min(180, center.lng)),
            Math.max(-85.051129, Math.min(85.051129, center.lat))
          ),
          zoom: Math.max(-2, Math.min(22, zoom))
        }),
        attributionControl: false,
        dragRotate: false,
        touchZoomRotate: true,
        pitchWithRotate: false
      })
      map.touchZoomRotate.disableRotation()
      map.on('load', () => {
        layer = new WarpedMapLayer()
        map!.addLayer(layer)
        layer.renderer?.addEventListener('imageinfofetcherror', (event) => {
          trackLoad(event, true, 'image')
          fail(
            'An image service could not be reached. Its map outline is still available.'
          )
        })
        layer.renderer?.addEventListener('imageloaded', (event) =>
          trackLoad(event, false, 'image')
        )
        layer.renderer?.tileCache.addEventListener(
          'tilefetcherror',
          (event) => {
            trackLoad(event, true, 'tile')
            fail(
              'Some image tiles could not be loaded. Try zooming out or check the image service.'
            )
          }
        )
        layer.renderer?.tileCache.addEventListener('maptileloaded', (event) =>
          trackLoad(event, false, 'tile')
        )
        ready = true
      })
      map.on('move', refresh)
      map.on('resize', refresh)
      map.on('error', (event) => fail(event.error))
      map.getCanvas().addEventListener('pointerdown', pointerDown, true)
    } catch (error) {
      fail(error)
    }
    return () => {
      disposed = true
      backgroundWorker?.terminate()
      if (frame !== undefined) cancelAnimationFrame(frame)
      map?.getCanvas().removeEventListener('pointerdown', pointerDown, true)
      map?.remove()
    }
  })
</script>

<svelte:window
  onpointermove={pointerMove}
  onpointerup={(event) => finishDrag(event)}
  onpointercancel={(event) => finishDrag(event, true)}
  onkeydown={keyboard}
  onkeyup={(event) => {
    sendToBack = event.altKey
    if (event.code === 'Space') spaceDown = false
  }}
  onblur={() => {
    spaceDown = false
    sendToBack = false
    finishDrag(undefined, true)
  }}
  ondragover={(event) => {
    event.preventDefault()
    if (!editingMask) draggingOver = true
  }}
  ondragleave={(event) => {
    if (!event.relatedTarget) draggingOver = false
  }}
  ondrop={drop}
/>

<main
  class="collage"
  class:control-gesture={activeControl !== undefined}
  style:--canvas-color={shades.green[0]}
  style:--dot-color={themeColors.green}
  style:--accent={themeColors.pink}
  style:--error-color={themeColors.red}
>
  <div
    bind:this={container}
    class="map-canvas"
    aria-label="Collage canvas"
  ></div>
  {#if !editingMask}
    <svg class="outlines" aria-hidden="true">
      {#each overlays as item (item.id)}
        <polygon
          points={item.points}
          class:selected={selectedIds.has(item.id)}
          class:failed={!!loadFailures[item.id]?.length}
        />
      {/each}
      {#if marquee}
        {@const rect = bounds([marquee.start, marquee.end])}
        <rect
          class="selection-box"
          x={rect[0]}
          y={rect[1]}
          width={rect[2] - rect[0]}
          height={rect[3] - rect[1]}
        />
      {/if}
    </svg>
  {/if}

  <header class="app-header">
    <div class="brand">
      <div class="brand-mark"><Logo /></div>
      <h1><strong>Allmaps</strong> <span>Collage</span></h1>
    </div>
    <nav aria-label="Collage actions">
      <button
        class="quiet-button"
        title="Open collage"
        aria-label="Open collage"
        onclick={() => showInput('open')}
        disabled={!ready || busy || !!editingMask}
        ><FolderOpen size={20} /></button
      >
      <button
        class="quiet-button"
        title="Save annotation"
        aria-label="Save annotation"
        onclick={save}
        disabled={!ready || busy || !!editingMask}
        ><DownloadSimple size={20} /></button
      >
      <button
        class="primary-button small"
        aria-label="Add maps"
        onclick={() => showInput('add')}
        disabled={!ready || busy || !!editingMask}
        ><Plus size={18} /><span>Add maps</span></button
      >
    </nav>
  </header>

  {#if !items.length && !inputMode}
    <section class="empty-state">
      <div class="paper-composition" aria-hidden="true">
        <svg viewBox="0 0 250 180">
          <path class="paper-one" d="M34 38 130 23 145 128 48 144Z" />
          <path
            class="paper-line"
            d="m39 69 97-15m-94 39 97-15m-94 39 97-15M66 33l14 106m21-111 15 106"
          />
          <path class="paper-two" d="m106 63 100-17 13 47-15 13 10 40-95 15Z" />
          <path
            class="paper-river"
            d="M142 59c-25 32 54 29 26 55s-17 24-13 41"
          />
          <circle cx="205" cy="46" r="5" /><circle cx="119" cy="161" r="5" />
        </svg>
      </div>
      <button
        class="primary-button"
        onclick={() => showInput('add')}
        disabled={!ready || busy}><Plus size={20} />Add your first maps</button
      >
      <button class="example-button" onclick={example} disabled={!ready || busy}
        >{busy ? 'Loading maps…' : 'Try random maps'}
        <span aria-hidden="true">↗</span></button
      >
    </section>
  {/if}

  {#if selected && controls && appearances && !inputMode && !editingMask}
    <MapControl
      position={controls.move.position}
      label={selection.length > 1 ? 'Move selected maps' : 'Move map'}
      disabled={busy}
      active={activeControl === 'move'}
      onpointerdown={(event) => beginDrag(event, selected!, 'move')}
      ><ArrowsOutCardinal size={19} /></MapControl
    >
    <MapControl
      position={controls.rotate.position}
      label={selection.length > 1
        ? 'Rotate selected maps'
        : 'Rotate map · Double-click to reset'}
      disabled={busy}
      active={activeControl === 'rotate'}
      value={Math.round(
        (((selectedRotation * 180) / Math.PI + 540) % 360) - 180
      ) + '°'}
      onpointerdown={(event) => beginDrag(event, selected!, 'rotate')}
      onkeydown={(event) => controlKey(event, 'rotate')}
      ondblclick={selection.length === 1 ? resetOrientation : undefined}
      ><ArrowClockwise size={19} /></MapControl
    >
    <MapControl
      position={controls.opacity.position}
      label="Opacity"
      disabled={busy || selection.length > 1}
      active={activeControl === 'opacity'}
      sliderValue={appearances.opacity}
      rail={controls.opacity.rail}
      value={Math.round(appearances.opacity * 100) + '%'}
      onpointerdown={(event) => beginDrag(event, selected!, 'opacity')}
      onkeydown={(event) => controlKey(event, 'opacity')}
      ><CircleHalf size={19} /></MapControl
    >
    <MapControl
      position={controls.hue.position}
      rail={controls.hue.rail}
      hueScale
      label="Colorize · Double-click to toggle"
      disabled={busy || selection.length > 1}
      pressed={appearances.colorize}
      active={activeControl === 'hue'}
      sliderValue={appearances.hue}
      value={hueColor(appearances.hue).toUpperCase()}
      onpointerdown={(event) => beginDrag(event, selected!, 'hue')}
      onkeydown={(event) => controlKey(event, 'hue')}
      ondblclick={toggleColorize}><Palette size={19} /></MapControl
    >
    <MapControl
      position={controls.saturation.position}
      label="Saturation"
      disabled={busy || selection.length > 1}
      pressed={appearances.saturation === 1}
      onclick={toggleSaturation}><DropHalf size={19} /></MapControl
    >
    <MapControl
      position={controls.background.position}
      label="Remove background"
      disabled={busy || selection.length > 1}
      pressed={appearances.removeBackground}
      onclick={toggleBackground}><MagicWand size={19} /></MapControl
    >
    <MapControl
      position={controls.mask.position}
      label="Apply mask"
      disabled={busy || selection.length > 1}
      pressed={appearances.applyMask}
      onclick={toggleMask}><Selection size={19} /></MapControl
    >
    <MapControl
      position={controls.editMask.position}
      label="Edit mask"
      disabled={busy || selection.length > 1}
      onclick={editMask}><Polygon size={19} /></MapControl
    >
    {#if selection.length > 1}
      <MapControl
        position={controls.organize.position}
        label="Organize selected maps"
        disabled={busy}
        onclick={organize}><Spiral size={19} /></MapControl
      >
    {/if}
    <MapControl
      position={controls.front.position}
      label={sendToBack
        ? 'Send to back · Release Alt/Option to bring to front'
        : 'Bring to front · Hold Alt/Option to send to back'}
      disabled={busy ||
        (sendToBack
          ? items.slice(0, selection.length)
          : items.slice(-selection.length)
        ).every((item) => selectedIds.has(item.instanceId))}
      onclick={(event) => changeOrder(!event.altKey)}
      >{#if sendToBack}<SendMapsToBack />{:else}<BringMapsToFront
        />{/if}</MapControl
    >
    <MapControl
      position={controls.duplicate.position}
      label={selection.length > 1 ? 'Duplicate selected maps' : 'Duplicate map'}
      disabled={busy}
      onclick={duplicate}><Copy size={19} /></MapControl
    >
    <MapControl
      position={controls.remove.position}
      label={selection.length > 1 ? 'Remove selected maps' : 'Remove map'}
      disabled={busy}
      onclick={removeSelected}><Trash size={19} /></MapControl
    >
  {/if}

  {#if !editingMask}
    <footer class="canvas-footer">
      <div class="view-controls">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onclick={() => map?.zoomIn()}
          disabled={!ready}><Plus size={19} /></button
        >
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onclick={() => map?.zoomOut()}
          disabled={!ready}><Minus size={19} /></button
        >
        <button
          title="Fit collage"
          aria-label="Fit collage"
          onclick={fit}
          disabled={!items.length}><ArrowsOut size={19} /></button
        >
        <button
          title="Undo (⌘/Ctrl Z)"
          aria-label="Undo"
          onclick={undo}
          disabled={!past.length || busy}><ArrowUUpLeft size={19} /></button
        >
        <button
          title="Redo (⌘/Ctrl Shift Z)"
          aria-label="Redo"
          onclick={redo}
          disabled={!future.length || busy}><ArrowUUpRight size={19} /></button
        >
      </div>
    </footer>
  {/if}

  <div class="sr-only" role="status" aria-live="polite">
    {busy ? 'Loading annotation…' : message}
  </div>
  {#if errorMessage && !inputMode && !editingMask}
    <div class="error-message" role="alert">
      <span>{errorMessage}</span><button
        aria-label="Dismiss error"
        onclick={() => (errorMessage = '')}><X size={18} /></button
      >
    </div>
  {/if}

  {#if inputMode}
    <div class="modal-backdrop">
      <dialog
        class="input-dialog"
        use:showDialog
        aria-labelledby="input-title"
        oncancel={(event) => {
          event.preventDefault()
          if (!busy) inputMode = undefined
        }}
      >
        <button
          class="close-dialog"
          aria-label="Close"
          onclick={() => (inputMode = undefined)}
          disabled={busy}><X size={22} /></button
        >
        <h2 id="input-title">
          {inputMode === 'add' ? 'Add maps' : 'Open a collage'}
        </h2>
        <form onsubmit={submit}>
          <label for="annotation-input">Annotation URL or JSON</label>
          <textarea
            id="annotation-input"
            bind:this={textInput}
            bind:value={inputText}
            rows="4"
            placeholder="https://annotations.allmaps.org/…"
            disabled={busy}></textarea>
          <button
            class="primary-button"
            type="submit"
            disabled={busy || !inputText.trim()}
            >{busy
              ? 'Loading…'
              : inputMode === 'add'
                ? 'Add all maps'
                : 'Open collage'}<Plus size={18} /></button
          >
        </form>
        {#if errorMessage}<p class="dialog-error" role="alert">
            {errorMessage}
          </p>{/if}
        <div class="file-divider"><span>or</span></div>
        <button
          class="upload-button"
          onclick={() => fileInput?.click()}
          disabled={busy}
          ><UploadSimple size={21} />Choose an annotation file</button
        >
        <input
          class="file-input"
          bind:this={fileInput}
          type="file"
          accept=".json,.geojson,.jsonld,application/json,application/ld+json"
          multiple={inputMode === 'add'}
          onchange={(event) => {
            void files(Array.from(event.currentTarget.files ?? []), inputMode!)
            event.currentTarget.value = ''
          }}
        />
      </dialog>
    </div>
  {/if}

  {#if draggingOver}<div class="drop-overlay">
      <UploadSimple size={42} /><strong>Drop maps</strong>
    </div>{/if}

  {#if editingMask && map && layer}
    <MaskEditor
      item={editingMask}
      failed={!!loadFailures[editingMask.instanceId]?.length}
      {map}
      {layer}
      {items}
      ondone={saveMask}
      oncancel={() => (editingMask = undefined)}
    />
  {/if}
</main>
