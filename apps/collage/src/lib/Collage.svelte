<script lang="ts">
  import {
    backgroundRemovalThreshold,
    backgroundRemovalHardness
  } from './export-effects'
  import { onMount, tick } from 'svelte'
  import { Map as MapLibreMap, LngLat } from 'maplibre-gl'
  import { ExportableMapLayer } from './export-layer'
  import { exportView } from './export-view'
  import ExportMenu from './ExportMenu.svelte'
  import FanMenu from './FanMenu.svelte'
  import ToolSettings from './ToolSettings.svelte'
  import SnapGrid from './SnapGrid.svelte'
  import SnapAxes from './SnapAxes.svelte'
  import TransformEditor from './TransformEditor.svelte'
  import {
    defaultToolSettings,
    parseToolSettings,
    visibleTools,
    importTransformationKey,
    parseImportTransformation,
    toolSettingsKey,
    doubleTapModeKey,
    parseDoubleTapMode
  } from './tool-settings'
  import type { ToolSetting, DoubleTapMode } from './tool-settings'
  import {
    createMoveSnapper,
    defaultSnapSettings,
    parseSnapSettings,
    snapSettingsKey,
    snapUnits
  } from './move-snapping'
  import type { SnapSettings, AxisGuide } from './move-snapping'
  import { toCanvasGeo, fromCanvasGeo, CANVAS_ZOOM_OFFSET } from './coordinates'
  import {
    Logo,
    LoadingSmall,
    BringMapsToFront,
    SendMapsToBack
  } from '@allmaps/ui'
  import { themeColors, shades } from '@allmaps/tailwind'
  import MapControl from './MapControl.svelte'
  import { buttonTooltips } from './button-tooltips'
  import MaskEditor from './MaskEditor.svelte'
  import { env as publicEnv } from './env'
  import type { GeoreferencedMap } from '@allmaps/annotation'
  import { updateLoadFailures } from './load-status'
  import { loadRandomMaps } from './random-maps'
  import { TouchNavigation } from './touch-navigation'
  import { TapSelection } from './tap-selection'
  import { TouchDoubleTap } from './double-tap'
  import { suspendMapNavigation } from './map-navigation'
  import { generateAnnotation } from '@allmaps/annotation'
  import type { LoadFailures } from './load-status'
  import type { AdoptSearchPreviews } from './search-previews'
  import BackgroundWorker from './background.worker.ts?worker'
  import LayoutWorker from './layout.worker.ts?worker'
  import { requestLayout } from './layout-client'
  import type { LayoutRequest } from './layout-task'
  import type { BackgroundRequest } from './background.worker'
  import {
    GearSix,
    Plus,
    Minus,
    FolderOpen,
    FolderSimple,
    FolderSimpleMinus,
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
    Polygon,
    BoundingBox,
    ArrowUp,
    FlipHorizontal,
    FlipVertical,
    SquaresFour,
    MapTrifold,
    AlignTop,
    AlignBottom,
    AlignLeft,
    AlignRight,
    AlignCenterHorizontal,
    AlignCenterVertical,
    Columns,
    Rows,
    ArrowsOutLineHorizontal,
    ArrowsOutLineVertical,
    MagnifyingGlass,
    ArrowSquareOut,
    Copy,
    LockSimple,
    LockSimpleOpen,
    SelectionPlus,
    Selection,
    HandTap,
    SelectionAll,
    Check
  } from 'phosphor-svelte'
  import {
    openCollage,
    originalAnnotationUrl,
    viewerUrl,
    exportCollage,
    placedMap,
    renderedMap,
    outline,
    mapCenter,
    contains,
    rotatePlacement,
    duplicateMaps,
    setResourceMask,
    resolveImageSize,
    bearingRotation,
    alignBearings,
    mirrorMap,
    transformationType
  } from './model'
  import type {
    Arrangement,
    CollageMap,
    Placement,
    ImportTransformation,
    MapImportOptions
  } from './model'
  import { snapRotation } from './rotation'
  import { alignMaps, distributeMaps } from './alignment'
  import type { Alignment, Distribution } from './alignment'
  import {
    selectionIds,
    selectionScope,
    selectionObjects,
    toggleSelection,
    selectionLocked,
    canEditLayout,
    singleGroup,
    groupMaps,
    ungroupMaps,
    setAppearance
  } from './selection'
  import type { Point } from '@allmaps/types'
  import {
    controlLayout,
    controlFold,
    railValue,
    hueColor,
    radiusForSize,
    fitControlCenter,
    preferredControlCenter
  } from './control-layout'
  import { bounds, clipPolygon, visibleCenter } from './geometry'
  import type {
    RingControl,
    ControlPosition,
    Rail,
    Slider
  } from './control-layout'

  let container: HTMLDivElement
  let fileInput = $state<HTMLInputElement>()
  let textInput = $state<HTMLTextAreaElement>()
  let map = $state.raw<MapLibreMap>()
  let layer = $state.raw<ExportableMapLayer>()
  let exportOpen = $state(false)
  let settingsOpen = $state(false)
  let importTransformation = $state<ImportTransformation>('helmert')
  let doubleTapMode = $state<DoubleTapMode>('mask')
  const editorTaps = new TouchDoubleTap<string>()
  let ignoreDoubleClickUntil = 0
  let altDown = $state(false)
  let toolSettings = $state.raw<ToolSetting[]>(defaultToolSettings())
  let snapping = $state.raw<SnapSettings>(defaultSnapSettings())
  let ready = $state(false)
  let busy = $state(false)
  let items = $state.raw<CollageMap[]>([])
  let selectedIds = $state.raw<Set<string>>(new Set())
  let selecting = $state(false)
  let selectionMode = $state<'tap' | 'box'>('tap')
  let selectButton = $state<HTMLButtonElement>()
  let selectionDoneButton = $state<HTMLButtonElement>()
  let restoreDoubleClickZoom = false
  let editingGroup = $state<string>()
  const visibleItems = $derived(selectionScope(items, editingGroup))
  const selection = $derived(
    items.filter((item) => selectedIds.has(item.instanceId))
  )
  const selected = $derived(rotationAnchor(selection))
  const locked = $derived(selectionLocked(selection))
  const grouped = $derived(singleGroup(selection))
  const layoutAvailable = $derived(canEditLayout(selection, editingGroup))
  const selectedObjectCount = $derived(
    selectionObjects(selection, editingGroup).length
  )
  let ringExpanded = $state(false)
  // Keep keyed rows stable; their children own reversible expand/collapse transitions.
  const allRingTools = $derived(visibleTools(toolSettings, true))
  const ringTools = $derived(visibleTools(toolSettings, ringExpanded))
  const atFront = $derived(
    selection.length > 0 &&
      items
        .slice(-selection.length)
        .every((item) => selectedIds.has(item.instanceId))
  )
  const toFront = $derived(altDown ? atFront : !atFront)
  const orderUnchanged = $derived(
    (toFront
      ? items.slice(-selection.length)
      : items.slice(0, selection.length)
    ).every((item) => selectedIds.has(item.instanceId))
  )

  function changeTools(settings: ToolSetting[]) {
    toolSettings = settings
    ringExpanded = false
    try {
      localStorage.setItem(toolSettingsKey, JSON.stringify(settings))
    } catch {
      /* Storage can be unavailable in private browsers. */
    }
    refresh()
  }
  function toggleRing() {
    ringExpanded = !ringExpanded
    refresh()
  }
  function changeImport(value: ImportTransformation) {
    importTransformation = value
    try {
      localStorage.setItem(importTransformationKey, value)
    } catch {
      /* Use the selection for this session if storage is unavailable. */
    }
  }
  function changeDoubleTap(value: DoubleTapMode) {
    doubleTapMode = value
    try {
      localStorage.setItem(doubleTapModeKey, value)
    } catch {
      /* Use the preference for this session if storage is unavailable. */
    }
  }
  function modifier(event: { altKey: boolean }) {
    if (altDown === event.altKey) return
    altDown = event.altKey
    refresh()
  }
  function changeSnapping(value: SnapSettings) {
    snapping = parseSnapSettings(value)
    try {
      localStorage.setItem(snapSettingsKey, JSON.stringify(snapping))
    } catch {
      /* Use these settings for the session if storage is unavailable. */
    }
  }
  const viewerLink = $derived(
    selection.length === 1 && selected
      ? viewerUrl(selected, publicEnv.PUBLIC_VIEWER_BASE_URL || undefined)
      : undefined
  )
  // Read through the changing selection array: selected's identity is stable
  // while gestures replace its placement, since items use $state.raw.
  const selectedRotation = $derived(
    rotationAnchor(selection)?.placement.rotation ?? 0
  )
  const allMirrored = $derived(
    selection.length > 0 && selection.every((item) => item.mirrored)
  )
  let overlays = $state.raw<{ id: string; points: string; grouped: boolean }[]>(
    []
  )
  let loadFailures = $state.raw<LoadFailures>({})
  type DragMode = 'move' | 'rotate' | Slider
  let controls = $state.raw<Record<RingControl, ControlPosition>>()
  let activeControl = $state<DragMode>()
  let moveGuide = $state.raw<AxisGuide>()
  const appearances = $derived(selection[0]?.appearance)
  let controlCenter = $state.raw<Point>()
  let controlRadius = $state(184)
  const ringFold = $derived(
    controlCenter
      ? controlFold(controlCenter, selectedRotation, controlRadius, ringTools)
      : undefined
  )
  let editingMask = $state.raw<CollageMap>()
  let editingTransform = $state.raw<CollageMap[]>()
  let searching = $state(false)
  let searchOrigin: Point = [0, 0]
  let marquee = $state.raw<{
    start: Point
    end: Point
    before: Set<string>
    pointerId: number
    moved: boolean
    threshold: number
  }>()
  let restoreMarqueeNavigation: (() => void) | undefined
  let backgroundWorker: Worker | undefined
  let inputMode = $state<'add' | 'open'>()
  let inputText = $state('')
  let layoutController = $state.raw<AbortController>()
  let exampleController: AbortController | undefined
  let errorMessage = $state('')
  let message = $state('All places. One scale.')
  let draggingOver = $state(false)
  let past = $state.raw<CollageMap[][]>([])
  let future = $state.raw<CollageMap[][]>([])
  let spaceDown = $state(false)
  let frame: number | undefined
  let latestPointer: PointerEvent | undefined
  const touchNavigation = new TouchNavigation()
  const tapSelection = new TapSelection()
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
        startRotation: number
        bearing: number
        rotated: boolean
        mode: DragMode
        rail?: Rail
        startRailValue: number
        pointer: Point
        snapMove?: ReturnType<typeof createMoveSnapper>
        angle: number
        before: CollageMap[]
        duplicateOnMove: boolean
        duplicated: boolean
        selectionBefore: string[]
        screen: Point
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
      const screen = map!.project(toCanvasGeo(point))
      return [screen.x, screen.y]
    })
  }

  function refresh() {
    if (!map) return
    const polygons = visibleItems.map((item) => ({
      id: item.instanceId,
      grouped: !!item.groupId,
      points: projectedOutline(item)
    }))
    overlays = polygons.map(({ id, points, grouped }) => ({
      id,
      grouped,
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
      const anchor = map.project(toCanvasGeo(drag.anchor))
      controlCenter = [anchor.x, anchor.y]
    } else {
      const pivot = selectionPivot(targets)
      const screen = map.project(toCanvasGeo(pivot))
      const points = selectedPolygons.flat()
      // Only camera zoom and the full map size drive docking. Clipping does
      // not move the anchor around as different fragments enter the viewport.
      const diameter =
        2 *
        Math.max(
          ...points.map(([x, y]) => Math.hypot(x - screen.x, y - screen.y))
        )
      controlRadius = radiusForSize(diameter, ringTools.length)
      controlCenter = preferredControlCenter([screen.x, screen.y], diameter, [
        viewport[2],
        viewport[3]
      ])
    }
    const layout = controlLayout(
      controlCenter,
      rotationAnchor(targets)!.placement.rotation,
      targets[0].appearance,
      controlRadius,
      ringTools
    )
    // Freeze the visible arc center throughout rotation. Re-docking mid-drag
    // would separate the controls from the pivot used to rotate the maps.
    if (drag?.mode !== 'rotate')
      controlCenter = fitControlCenter(controlCenter, layout, [
        viewport[2],
        viewport[3]
      ])
    controls = controlLayout(
      controlCenter,
      rotationAnchor(targets)!.placement.rotation,
      targets[0].appearance,
      controlRadius,
      ringTools
    )
  }

  function rotationAnchor(targets: CollageMap[]) {
    return (
      targets.find(
        (item) => item.instanceId === selectedIds.values().next().value
      ) ?? targets[0]
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

  function rotationPivot(targets = selection): Point {
    return controlCenter ? worldAt(controlCenter) : selectionPivot(targets)
  }

  function select(ids: string[] = []) {
    const next = selectionIds(items, ids, editingGroup)
    if (
      next.size !== selectedIds.size ||
      [...next].some((id) => !selectedIds.has(id))
    )
      ringExpanded = false
    selectedIds = next
    if (selecting)
      message = `${selectedIds.size} ${selectedIds.size === 1 ? 'map' : 'maps'} selected.`
    refresh()
  }

  async function startSelecting() {
    if (
      !map ||
      !ready ||
      busy ||
      drag ||
      marquee ||
      !visibleItems.length ||
      editingMask ||
      editingTransform ||
      inputMode ||
      searching ||
      exportOpen ||
      settingsOpen
    )
      return
    map.stop()
    editorTaps.reset()
    tapSelection.cancel()
    restoreDoubleClickZoom = map.doubleClickZoom.isEnabled()
    map.doubleClickZoom.disable()
    selecting = true
    selectionMode = 'tap'
    message = 'Select maps. Tap a map to add or remove it from the selection.'
    await tick()
    selectionDoneButton?.focus({ preventScroll: true })
  }

  function finishSelecting() {
    cancelSelectionGesture()
    selecting = false
    spaceDown = false
    if (restoreDoubleClickZoom) map?.doubleClickZoom.enable()
    restoreDoubleClickZoom = false
    selectButton?.focus({ preventScroll: true })
  }

  function cancelSelectionGesture() {
    tapSelection.cancel()
    if (marquee) finishDrag(undefined, true)
  }

  function changeSelectionMode(mode: 'tap' | 'box') {
    cancelSelectionGesture()
    selectionMode = mode
    message =
      mode === 'box'
        ? 'Drag a box to add maps. Use two fingers to pan or zoom.'
        : 'Tap a map to add or remove it from the selection.'
  }

  function updateGroupVisibility() {
    // Undo or deleting the final member can remove the group being edited.
    if (editingGroup && !items.some((item) => item.groupId === editingGroup))
      editingGroup = undefined
    for (const item of items) {
      const visible = !editingGroup || item.groupId === editingGroup
      if (layer?.getWarpedMap(item.instanceId)?.visible !== visible)
        layer?.setMapOptions(item.instanceId, { visible }, { animate: false })
    }
  }

  function editGroup(item: CollageMap) {
    if (
      !item.groupId ||
      selecting ||
      busy ||
      drag ||
      editingMask ||
      editingTransform ||
      editingGroup
    )
      return
    const members = selectionScope(items, item.groupId)
    if (selectionLocked(members)) return
    map?.stop()
    editingGroup = item.groupId
    updateGroupVisibility()
    select([item.instanceId])
  }

  function finishGroupEdit() {
    if (
      !editingGroup ||
      busy ||
      drag ||
      marquee ||
      editingMask ||
      editingTransform
    )
      return
    const ids = visibleItems.map((item) => item.instanceId)
    editingGroup = undefined
    updateGroupVisibility()
    select(ids)
  }

  function toggleLock() {
    if (!selecting || !selection.length || busy || drag || marquee) return
    remember()
    const next = !locked
    for (const item of selection) item.locked = next
    items = [...items]
    refresh()
  }

  function changeGroup(ungroup = false) {
    if (
      busy ||
      drag ||
      marquee ||
      editingMask ||
      editingTransform ||
      (editingGroup && !ungroup)
    )
      return
    const targets = editingGroup ? visibleItems : selection
    if (selectionLocked(targets)) return
    const before = structuredClone(items)
    if (!(ungroup ? ungroupMaps(targets) : groupMaps(targets))) return
    remember(before)
    items = [...items]
    if (editingGroup) {
      editingGroup = undefined
      updateGroupVisibility()
      select(targets.map((item) => item.instanceId))
    } else refresh()
  }

  function screenPoint(event: PointerEvent): Point {
    const rect = container.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function worldAt(screen: Point): Point {
    const point = map!.unproject(screen)
    return fromCanvasGeo([point.lng, point.lat])
  }

  function worldPoint(event: PointerEvent): Point {
    const bounds = container.getBoundingClientRect()
    const point = map!.unproject([
      event.clientX - bounds.left,
      event.clientY - bounds.top
    ])
    return fromCanvasGeo([point.lng, point.lat])
  }

  function updateRaster(item: CollageMap) {
    layer!.setMapOptions(
      item.instanceId,
      {
        gcps: renderedMap(item).gcps,
        transformationType: transformationType(item.baseline)
      },
      {
        animate: false
      }
    )
  }

  function fit(targets = visibleItems) {
    if (!map || !targets.length) return
    const points = targets.flatMap(outline).map((point) => toCanvasGeo(point))
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
        maxZoom: 18 + CANVAS_ZOOM_OFFSET,
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
        removeColorHardness: backgroundRemovalHardness,
        removeColorThreshold: appearance.removeBackground
          ? backgroundRemovalThreshold
          : 0
      },
      { animate: false }
    )
  }

  function renderItem(item: CollageMap) {
    layer!.addGeoreferencedMap({ ...renderedMap(item), id: item.instanceId })
    layer!.setMapOptions(
      item.instanceId,
      { visible: !editingGroup || item.groupId === editingGroup },
      { animate: false }
    )
    updateAppearance(item)
  }

  function changeOrder(toFront: boolean) {
    if (!selection.length || locked || busy || drag) return
    const rest = items.filter((item) => !selectedIds.has(item.instanceId))
    const next = toFront ? [...rest, ...selection] : [...selection, ...rest]
    if (next.every((item, i) => item === items[i])) return
    remember()
    items = next
    layer!.bringMapsToFront(items.map((item) => item.instanceId))
    refresh()
  }

  function duplicate() {
    if (!selection.length || locked || busy || drag || !map) return
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
      const copies = duplicateMaps(
        selection,
        [(to[0] - from[0]) * factor, (to[1] - from[1]) * factor],
        { editingGroup }
      )
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

  async function runLayout(request: LayoutRequest) {
    const controller = new AbortController()
    layoutController = controller
    try {
      return await requestLayout(new LayoutWorker(), request, controller.signal)
    } finally {
      if (layoutController === controller) layoutController = undefined
    }
  }

  function layoutFailure(error: unknown) {
    if (disposed) return
    if (error instanceof DOMException && error.name === 'AbortError')
      message = 'Arrangement cancelled.'
    else fail(error)
  }

  async function organize(arrangement: Arrangement = 'compact') {
    if (!layoutAvailable || busy || drag) return
    const before = structuredClone(items)
    const anchorId = selectedIds.values().next().value!
    busy = true
    errorMessage = ''
    let applying = false
    try {
      const result = await runLayout({
        type: 'arrange',
        items: selection,
        arrangement,
        anchorId
      })
      if (disposed) return
      applying = true
      result.items.forEach(updateRaster)
      const arranged = new Map(
        result.items.map((item) => [item.instanceId, item])
      )
      items = items.map((item) => arranged.get(item.instanceId) ?? item)
      remember(before)
      refresh()
      fit(result.items)
      message =
        arrangement === 'geographic'
          ? 'Geographic positions restored. The first selected map stays fixed.'
          : 'Selected maps arranged. The first selected map stays fixed.'
      if (result.fallback)
        fail(
          'Compact arrangement could not converge. A simple packing was used instead.'
        )
    } catch (error) {
      if (applying && !disposed) restore(before)
      layoutFailure(error)
    } finally {
      busy = false
    }
  }

  function align(alignment: Alignment) {
    editLayout((next) => alignMaps(next, alignment, editingGroup))
  }

  function distribute(direction: Distribution) {
    editLayout((next) => distributeMaps(next, direction, editingGroup))
  }

  function editLayout(apply: (next: CollageMap[]) => boolean) {
    if (!layoutAvailable || busy || drag) return
    const before = structuredClone(items)
    const next = structuredClone(selection)
    let applying = false
    try {
      if (!apply(next)) return
      errorMessage = ''
      applying = true
      next.forEach(updateRaster)
      const updated = new Map(next.map((item) => [item.instanceId, item]))
      items = items.map((item) => updated.get(item.instanceId) ?? item)
      remember(before)
      refresh()
      fit(next)
    } catch (error) {
      if (applying) restore(before)
      fail(error)
    }
  }

  function editTransform() {
    if (
      selecting ||
      !selection.length ||
      locked ||
      busy ||
      drag ||
      selection.some(
        (item) =>
          !['helmert', 'polynomial1'].includes(
            transformationType(item.baseline)
          )
      )
    )
      return
    errorMessage = ''
    map?.stop()
    editingTransform = selection
  }

  function saveTransform(draft: CollageMap[]) {
    const before = structuredClone(items)
    try {
      draft.forEach(updateRaster)
      if (JSON.stringify(draft) !== JSON.stringify(editingTransform)) {
        remember(before)
        const updates = new Map(draft.map((item) => [item.instanceId, item]))
        items = items.map((item) => updates.get(item.instanceId) ?? item)
      }
      editingTransform = undefined
      refresh()
    } catch (error) {
      editingTransform = undefined
      restore(before)
      fail(error)
    }
  }

  function editMask() {
    if (selecting || selection.length !== 1 || locked || busy || drag) return
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
    ignoreDoubleClickUntil = performance.now() + 400
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

  async function backgroundColor(item: CollageMap) {
    let color = item.appearance.backgroundColor
    if (!color) {
      const image = layer!.getWarpedMap(item.instanceId)?.image
      if (!image)
        throw new Error('The image is still loading. Try again in a moment.')
      const request = image.getImageRequest({ width: 512, height: 512 })
      const rows = (Array.isArray(request) ? request : [[request]]).map((row) =>
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
    return color
  }

  async function toggleBackground() {
    if (!selection.length || locked || busy || drag) return
    const targets = [...selection]
    const enabled = !targets.every((item) => item.appearance.removeBackground)
    busy = true
    errorMessage = ''
    try {
      // Detect each paper color separately; a group shares the setting, not
      // its members' paper colors. Apply only once every detection succeeds.
      const colors: (string | undefined)[] = []
      for (const item of targets) {
        colors.push(
          enabled
            ? await backgroundColor(item)
            : item.appearance.backgroundColor
        )
        if (disposed) return
      }
      if (targets.some((item) => !items.includes(item))) return
      remember()
      targets.forEach((item, index) => {
        item.appearance = {
          ...item.appearance,
          backgroundColor: colors[index],
          removeBackground: enabled
        }
        updateAppearance(item)
      })
      items = [...items]
    } catch (error) {
      fail(error)
    } finally {
      busy = false
    }
  }

  function install(
    next: CollageMap[],
    replace: boolean,
    { render = true }: { render?: boolean } = {}
  ) {
    const added: CollageMap[] = []
    try {
      for (const item of render ? next : []) {
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
    if (!render) layer!.bringMapsToFront(next.map((item) => item.instanceId))
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

  async function prepare(
    input: unknown,
    mode: 'add' | 'open',
    sourceUrl?: string,
    options: MapImportOptions = {}
  ) {
    if (mode === 'open') return openCollage(input, sourceUrl)
    const center = map!.getCenter()
    const result = await runLayout({
      ...options,
      type: 'add',
      importTransformation,
      input,
      sourceUrl,
      at: fromCanvasGeo([center.lng, center.lat])
    })
    if (result.fallback)
      fail(
        'Compact arrangement could not converge. A simple packing was used instead.'
      )
    return result.items
  }

  function search() {
    if (
      !map ||
      selecting ||
      busy ||
      editingMask ||
      editingTransform ||
      editingGroup ||
      drag
    )
      return
    const center = map.getCenter()
    searchOrigin = fromCanvasGeo([center.lng, center.lat])
    errorMessage = ''
    searching = true
  }

  function constrainCollage(center: LngLat, zoom: number) {
    return {
      center: new LngLat(
        Math.max(-180, Math.min(180, center.lng)),
        Math.max(-85.051129, Math.min(85.051129, center.lat))
      ),
      zoom: Math.max(-2, Math.min(22 + CANVAS_ZOOM_OFFSET, zoom))
    }
  }

  async function addSearchMaps(
    maps: GeoreferencedMap[],
    originalMasks: Point[][],
    adopt: AdoptSearchPreviews
  ) {
    busy = true
    try {
      const result = await runLayout({
        type: 'add',
        groupImportedMaps: false,
        importTransformation,
        input: generateAnnotation(maps),
        at: searchOrigin
      })
      result.items.forEach((item, i) => {
        item.originalResourceMask = structuredClone(originalMasks[i])
        item.sourceUrl = originalAnnotationUrl(maps[i]) ?? maps[i].id
      })
      if (disposed) return
      adopt(result.items, (item) => {
        layer!.setMapOptions(
          item.instanceId,
          {
            gcps: renderedMap(item).gcps,
            transformationType: transformationType(item.baseline),
            resourceMask: item.resourceMask,
            visible: true
          },
          { animate: false }
        )
        updateAppearance(item)
      })
      // Search cleanup removes only unselected previews and restores the camera.
      // The imported maps keep their renderer instances and tile-cache identities.
      searching = false
      await tick()
      install(result.items, false, { render: false })
      if (result.fallback)
        fail('Compact arrangement used a simple packing fallback.')
    } catch (error) {
      if (searching) throw error
      fail(error)
    } finally {
      busy = false
    }
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
      const mode = inputMode
      const next = await prepare(input, mode, isJson ? undefined : value)
      if (!disposed) install(next, mode === 'open')
    } catch (error) {
      layoutFailure(error)
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
      // Keep file boundaries for grouping, but arrange all imports in one batch.
      const next = await prepare(inputs[0], mode, undefined, {
        additionalInputs: inputs.slice(1)
      })
      if (!disposed) install(next, mode === 'open')
    } catch (error) {
      layoutFailure(error)
    } finally {
      busy = false
    }
  }

  async function showInput(mode: 'add' | 'open') {
    if (editingGroup || selecting) return
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
    const controller = new AbortController()
    exampleController = controller
    try {
      const maps = await loadRandomMaps({ signal: controller.signal })
      if (disposed) return
      const next = await prepare(generateAnnotation(maps), 'add', undefined, {
        groupImportedMaps: false
      })
      next.forEach((item, i) => {
        item.sourceUrl = originalAnnotationUrl(maps[i]) ?? maps[i].id
      })
      if (!disposed) install(next, false)
    } catch (error) {
      layoutFailure(error)
    } finally {
      exampleController = undefined
      busy = false
    }
  }

  function save(targets = items) {
    if (!targets.length) return
    try {
      const data = JSON.stringify(exportCollage(targets), null, 2)
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
    updateGroupVisibility()
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
    if (!selection.length || locked || drag || busy) return
    remember()
    for (const item of selection)
      layer!.removeGeoreferencedMapById(item.instanceId)
    items = items.filter((item) => !selectedIds.has(item.instanceId))
    updateGroupVisibility()
    select()
  }

  function changeAppearance(patch: Partial<CollageMap['appearance']>) {
    if (!selection.length || locked || busy || drag) return
    remember()
    setAppearance(selection, patch)
    selection.forEach(updateAppearance)
    items = [...items]
    refresh()
  }

  function toggleSaturation() {
    changeAppearance({
      saturation: selection.every((item) => item.appearance.saturation === 1)
        ? 0
        : 1
    })
  }

  function toggleColorize() {
    changeAppearance({
      colorize: !selection.every((item) => item.appearance.colorize)
    })
  }

  function controlKey(
    event: KeyboardEvent,
    mode: 'rotate' | 'opacity' | 'hue'
  ) {
    if (!selected || locked || busy || drag) return
    if (
      mode === 'rotate' &&
      event.altKey &&
      ['Enter', ' '].includes(event.key)
    ) {
      event.preventDefault()
      event.stopPropagation()
      alignToBearing()
      return
    }
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
      const pivot = rotationPivot()
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
                  appearances![mode] +
                    direction * (mode === 'hue' ? 1 / 36 : 0.05)
                )
              )
      setAppearance(selection, {
        [mode]: value,
        ...(mode === 'hue' ? { colorize: true } : {})
      })
      selection.forEach(updateAppearance)
    }
    items = [...items]
    refresh()
  }

  function alignToBearing() {
    if (
      !selection.length ||
      locked ||
      busy ||
      drag ||
      editingMask ||
      editingTransform ||
      searching
    )
      return
    const before = structuredClone(items)
    try {
      const changed = structuredClone(selection)
      alignBearings(changed)
      changed.forEach(updateRaster)
      const replacements = new Map(
        changed.map((item) => [item.instanceId, item])
      )
      items = items.map((item) => replacements.get(item.instanceId) ?? item)
      remember(before)
      refresh()
      message =
        changed.length === 1
          ? 'Map made upright.'
          : 'Selected maps made upright.'
    } catch (error) {
      restore(before)
      fail(error)
    }
  }

  function mirrorSelected(event: MouseEvent) {
    if (
      !selection.length ||
      locked ||
      busy ||
      drag ||
      editingMask ||
      editingTransform ||
      searching
    )
      return
    const before = structuredClone(items)
    try {
      const changed = structuredClone(selection)
      changed.forEach((item) =>
        mirrorMap(item, event.altKey ? 'vertical' : 'horizontal')
      )
      changed.forEach(updateRaster)
      const replacements = new Map(
        changed.map((item) => [item.instanceId, item])
      )
      items = items.map((item) => replacements.get(item.instanceId) ?? item)
      remember(before)
      refresh()
      message =
        changed.length === 1 ? 'Map mirrored.' : 'Selected maps mirrored.'
    } catch (error) {
      restore(before)
      fail(error)
    }
  }

  function resetOrientation() {
    if (!selected || locked || busy || drag) return
    errorMessage = ''
    const before = structuredClone(items)
    const angle = -selected.placement.rotation
    const pivot = rotationPivot()
    try {
      selection.forEach((item) => {
        item.placement = rotatePlacement(item.placement, pivot, angle)
      })
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

  function beginDrag(event: PointerEvent, item: CollageMap, mode: DragMode) {
    if (
      selecting ||
      busy ||
      drag ||
      marquee ||
      touchNavigation.active ||
      event.button !== 0 ||
      !map
    )
      return
    if (!selectedIds.has(item.instanceId)) select([item.instanceId])
    if (locked) return
    event.preventDefault()
    event.stopPropagation()
    // Alt/Option-click aligns on release; it must not start a drag as well.
    if (mode === 'rotate' && event.altKey) return
    const targets = items.filter((candidate) =>
      selectedIds.has(candidate.instanceId)
    )
    const pointer = worldPoint(event)
    const screen = screenPoint(event)
    const controlPivot = rotationPivot(targets)
    const pivot = controlPivot
    const rail = controls?.[mode]?.rail
    const anchor = rotationAnchor(targets)!
    let bearing = 0
    if (mode === 'rotate') {
      try {
        bearing = bearingRotation(anchor)
      } catch (error) {
        fail(error)
        return
      }
    }
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
      startRotation: anchor.placement.rotation,
      bearing,
      rotated: false,
      mode,
      pointer,
      snapMove:
        mode === 'move' && (snapping.grid || snapping.axes)
          ? createMoveSnapper(
              targets.flatMap(outline),
              snapping,
              exportView(map).metersPerPixel
            )
          : undefined,
      rail,
      startRailValue: rail ? railValue(screen, rail) : 0,
      angle: Math.atan2(
        pointer[1] - controlPivot[1],
        pointer[0] - controlPivot[0]
      ),
      before: structuredClone(items),
      duplicateOnMove: mode === 'move' && event.altKey,
      duplicated: false,
      selectionBefore: [...selectedIds],
      screen,
      outlineOnly: false,
      pointerId: event.pointerId
    }
    activeControl = mode
    moveGuide = drag.snapMove?.guide
    map.dragPan.disable()
    map.getCanvas().style.cursor = mode === 'move' ? 'grabbing' : 'crosshair'
    ;(event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId)
  }

  function mapAt(event: { clientX: number; clientY: number }) {
    const rect = map!.getCanvas().getBoundingClientRect()
    const point = worldAt([event.clientX - rect.left, event.clientY - rect.top])
    return [...visibleItems]
      .reverse()
      .find((item) => contains(point, outline(item)))
  }

  function openMapEditor(item: CollageMap) {
    if (item.groupId && !editingGroup) editGroup(item)
    else {
      select([item.instanceId])
      if (doubleTapMode === 'transform') editTransform()
      else editMask()
    }
  }

  function doubleClick(event: MouseEvent) {
    if (performance.now() < ignoreDoubleClickUntil) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (
      selecting ||
      !ready ||
      busy ||
      inputMode ||
      editingMask ||
      editingTransform ||
      searching ||
      spaceDown ||
      event.altKey
    )
      return
    const item = mapAt(event)
    if (!item) return
    event.preventDefault()
    event.stopImmediatePropagation()
    openMapEditor(item)
  }

  function pointerDown(event: PointerEvent) {
    if (
      !ready ||
      busy ||
      drag ||
      marquee ||
      touchNavigation.active ||
      spaceDown ||
      event.button !== 0 ||
      inputMode ||
      editingMask ||
      editingTransform ||
      searching
    )
      return
    // Stop camera inertia before hit testing. Panning and pinching still belong
    // to MapLibre; their movement cancels this pending tap.
    if (selecting) map!.stop()
    const point = worldPoint(event)
    const item = [...visibleItems]
      .reverse()
      .find((item) => contains(point, outline(item)))
    if (selecting) {
      tapSelection.start(event, item?.instanceId)
      if (selectionMode === 'box') startMarquee(event)
      return
    }
    const additive = event.shiftKey || event.metaKey || event.ctrlKey
    editorTaps.start(
      event,
      !additive && !event.altKey ? item?.instanceId : undefined
    )
    if (item) {
      if (additive) {
        event.preventDefault()
        event.stopPropagation()
        select([
          ...toggleSelection(items, selectedIds, item.instanceId, editingGroup)
        ])
      } else beginDrag(event, item, 'move')
    } else if (additive) startMarquee(event)
    else select()
  }

  function startMarquee(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    const start = screenPoint(event)
    restoreMarqueeNavigation = suspendMapNavigation(map!)
    marquee = {
      start,
      end: start,
      before: new Set(selectedIds),
      pointerId: event.pointerId,
      moved: false,
      // Match tap-selection's tolerance so a small touch wobble stays a tap.
      threshold: selecting ? 8 : 3
    }
    map!.getCanvas().setPointerCapture(event.pointerId)
  }

  function updateMarquee(end: Point) {
    if (!marquee) return
    marquee = {
      ...marquee,
      end,
      moved:
        marquee.moved ||
        Math.hypot(end[0] - marquee.start[0], end[1] - marquee.start[1]) >
          marquee.threshold
    }
    if (!marquee.moved) return
    const rect = bounds([marquee.start, end])
    select([
      ...marquee.before,
      ...visibleItems
        .filter((item) => clipPolygon(projectedOutline(item), rect).length >= 3)
        .map((item) => item.instanceId)
    ])
  }

  function cancelMarqueeCapture(event: PointerEvent) {
    if (marquee?.pointerId === event.pointerId) cancelSelectionGesture()
  }

  function updateDrag(event: PointerEvent) {
    if (!drag || touchNavigation.active) return
    const point = worldPoint(event)
    const screen = screenPoint(event)
    if (drag.mode === 'opacity' || drag.mode === 'hue') {
      const { appearance } = drag.targets[0]
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
      // A click alone must not flatten mixed settings in a group.
      const targets = drag.targets.map(({ item }) => item)
      if (changed) {
        setAppearance(targets, {
          [drag.mode]: value,
          ...(drag.mode === 'hue' ? { colorize: true } : {})
        })
      } else {
        drag.targets.forEach(({ item, appearance }) => {
          item.appearance = appearance
        })
      }
      targets.forEach(updateAppearance)
      items = [...items]
      refresh()
      return
    }
    const gesture = drag
    const previous = gesture.targets.map(({ item }) =>
      structuredClone(item.placement)
    )
    if (gesture.mode === 'move') {
      if (gesture.duplicateOnMove && !gesture.duplicated) {
        if (
          Math.hypot(
            screen[0] - gesture.screen[0],
            screen[1] - gesture.screen[1]
          ) < 3
        )
          return
        const added: CollageMap[] = []
        try {
          const copies = duplicateMaps(
            gesture.targets.map(({ item }) => item),
            [0, 0],
            { editingGroup }
          )
          for (const copy of copies) {
            added.push(copy)
            renderItem(copy)
          }
          gesture.targets = copies.map((item) => ({
            item,
            start: structuredClone(item.placement),
            appearance: structuredClone(item.appearance)
          }))
          gesture.duplicated = true
          items = [...items, ...copies]
          select(copies.map((item) => item.instanceId))
        } catch (error) {
          for (const copy of added)
            layer!.removeGeoreferencedMapById(copy.instanceId)
          finishDrag(undefined, true)
          fail(error)
          return
        }
      }
      const movement: Point = [
        point[0] - gesture.pointer[0],
        point[1] - gesture.pointer[1]
      ]
      const delta = gesture.snapMove?.(movement) ?? movement
      moveGuide = gesture.snapMove?.guide
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
      const step = Math.atan2(
        Math.sin(angle - gesture.angle),
        Math.cos(angle - gesture.angle)
      )
      gesture.rotation += step
      gesture.rotated ||= Math.abs(step) > 1e-8
      gesture.angle = angle
      if (!gesture.rotated) return
      const delta =
        snapRotation(
          gesture.startRotation + gesture.rotation,
          gesture.bearing,
          event.shiftKey,
          snapping.rotation ? snapping.rotationStep : undefined
        ) - gesture.startRotation
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
    modifier(event)
    tapSelection.move(event)
    editorTaps.move(event)
    if (touchNavigation.active) return
    if (marquee?.pointerId === event.pointerId) {
      updateMarquee(screenPoint(event))
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
      const completed = marquee
      if (cancel) select([...completed.before])
      else updateMarquee(event ? screenPoint(event) : completed.end)
      marquee = undefined
      restoreMarqueeNavigation?.()
      restoreMarqueeNavigation = undefined
      const canvas = map?.getCanvas()
      if (canvas?.hasPointerCapture(completed.pointerId))
        canvas.releasePointerCapture(completed.pointerId)
      return
    }
    if (!drag || (event && event.pointerId !== drag.pointerId)) return
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    if (event && !cancel) updateDrag(event)
    if (!drag) return
    const completed = drag
    drag = undefined
    activeControl = undefined
    moveGuide = undefined
    latestPointer = undefined
    const rollback = () =>
      completed.targets.forEach(({ item, start, appearance }) => {
        item.placement = start
        item.appearance = appearance
      })
    if (cancel && completed.duplicated) {
      restore(completed.before)
      select(completed.selectionBefore)
    } else if (cancel) rollback()
    try {
      if (!(cancel && completed.duplicated))
        completed.targets.forEach(({ item }) => {
          updateRaster(item)
          updateAppearance(item)
        })
      if (
        !cancel &&
        (completed.duplicated ||
          completed.targets.some(
            ({ item, start, appearance }) =>
              JSON.stringify(start) !== JSON.stringify(item.placement) ||
              JSON.stringify(appearance) !== JSON.stringify(item.appearance)
          ))
      )
        remember(completed.before)
    } catch (error) {
      if (completed.duplicated) {
        restore(completed.before)
        select(completed.selectionBefore)
      } else {
        rollback()
        completed.targets.forEach(({ item }) => {
          updateRaster(item)
          updateAppearance(item)
        })
      }
      fail(error)
    }
    items = [...items]
    map?.dragPan.enable()
    if (map) map.getCanvas().style.cursor = ''
    refresh()
  }

  function trackTouchStart(event: PointerEvent) {
    // Capture before hit testing, including a first finger on empty canvas and
    // a second on a map/control. Cancel rolls back edits and any queued frame,
    // restores panning, and leaves MapLibre's touch events free to pan/zoom.
    if (touchNavigation.start(event)) {
      editorTaps.reset()
      tapSelection.cancel()
      finishDrag(undefined, true)
    }
  }

  function finishPointer(event: PointerEvent, cancel = false) {
    if (cancel) {
      tapSelection.cancel()
      editorTaps.reset()
    }
    const id = tapSelection.end(event)
    finishDrag(event, cancel)
    if (
      !cancel &&
      ready &&
      map &&
      !busy &&
      !inputMode &&
      !searching &&
      !settingsOpen &&
      !selecting &&
      !editingMask &&
      !editingTransform &&
      !touchNavigation.active &&
      event.pointerType === 'touch'
    ) {
      const id = editorTaps.end(event, mapAt(event)?.instanceId)
      const item = items.find((item) => item.instanceId === id)
      if (item) {
        ignoreDoubleClickUntil = performance.now() + 500
        openMapEditor(item)
      }
    }
    if (selecting && id && !touchNavigation.active)
      select([...toggleSelection(items, selectedIds, id, editingGroup)])
  }

  function trackTouchEnd(event: PointerEvent) {
    touchNavigation.end(event)
  }

  function keyboard(event: KeyboardEvent) {
    modifier(event)
    if (
      editingMask ||
      editingTransform ||
      searching ||
      exportOpen ||
      settingsOpen
    )
      return
    if (selecting) {
      const command = event.metaKey || event.ctrlKey
      if (event.key === 'Escape' || (command && event.key === 'Enter')) {
        event.preventDefault()
        if (event.key === 'Escape' && marquee) cancelSelectionGesture()
        else finishSelecting()
      } else if (command && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        cancelSelectionGesture()
        select(visibleItems.map((item) => item.instanceId))
      } else if (command && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        changeGroup(event.shiftKey)
      } else if (
        event.code === 'Space' &&
        !(event.target as HTMLElement)?.closest('button')
      ) {
        event.preventDefault()
        cancelSelectionGesture()
        spaceDown = true
      } else if (
        (command && ['z', 's'].includes(event.key.toLowerCase())) ||
        event.key === 'Backspace' ||
        event.key === 'Delete'
      )
        event.preventDefault()
      return
    }
    if (event.key === 'Escape') {
      if (layoutController) {
        layoutController.abort()
        return
      }
      if (exampleController) {
        exampleController.abort()
        return
      }
      if (drag || marquee) finishDrag(undefined, true)
      else if (!busy) {
        inputMode = undefined
        if (editingGroup) finishGroupEdit()
        else select()
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
    if (
      editingGroup &&
      (event.metaKey || event.ctrlKey) &&
      event.key === 'Enter'
    ) {
      event.preventDefault()
      finishGroupEdit()
    } else if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'a'
    ) {
      event.preventDefault()
      if (!drag && !marquee && !busy)
        select(visibleItems.map((item) => item.instanceId))
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
      if (editingGroup) finishGroupEdit()
      else save()
    } else if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'g'
    ) {
      event.preventDefault()
      changeGroup(event.shiftKey)
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      removeSelected()
    }
  }

  async function drop(event: DragEvent) {
    event.preventDefault()
    draggingOver = false
    if (
      selecting ||
      busy ||
      !ready ||
      drag ||
      editingMask ||
      editingTransform ||
      editingGroup ||
      searching
    )
      return
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
      importTransformation = parseImportTransformation(
        localStorage.getItem(importTransformationKey)
      )
      toolSettings = parseToolSettings(
        JSON.parse(localStorage.getItem(toolSettingsKey) ?? 'null')
      )
    } catch {
      /* Use defaults when storage is unavailable. */
    }
    try {
      doubleTapMode = parseDoubleTapMode(localStorage.getItem(doubleTapModeKey))
    } catch {
      /* Use the default when storage is unavailable. */
    }
    try {
      snapping = parseSnapSettings(
        JSON.parse(localStorage.getItem(snapSettingsKey) ?? 'null')
      )
    } catch {
      /* Ignore invalid stored settings independently of tool preferences. */
    }
    window.addEventListener('pointerdown', trackTouchStart, true)
    window.addEventListener('pointerup', trackTouchEnd, true)
    window.addEventListener('pointercancel', trackTouchEnd, true)
    try {
      map = new MapLibreMap({
        container,
        style: { version: 8, sources: {}, layers: [] },
        center: [0, 0],
        zoom: 13 + CANVAS_ZOOM_OFFSET,
        minZoom: -2,
        maxPitch: 0,
        maxCanvasSize: [8192, 8192],
        maxZoom: 22 + CANVAS_ZOOM_OFFSET,
        renderWorldCopies: false,
        // Keep a finite Mercator center while allowing the viewport to extend
        // beyond the world rectangle, instead of forcing it to fill the screen.
        transformConstrain: constrainCollage,
        attributionControl: false,
        dragRotate: false,
        touchZoomRotate: true,
        pitchWithRotate: false
      })
      map.keyboard.disableRotation()
      map.touchZoomRotate.disableRotation()
      map.on('load', () => {
        layer = new ExportableMapLayer()
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
      map.on('movestart', cancelSelectionGesture)
      map.on('resize', refresh)
      map.on('error', (event) => fail(event.error))
      map.getCanvas().addEventListener('pointerdown', pointerDown, true)
      map.getCanvas().addEventListener('dblclick', doubleClick, true)
      map
        .getCanvas()
        .addEventListener('lostpointercapture', cancelMarqueeCapture)
    } catch (error) {
      fail(error)
    }
    return () => {
      disposed = true
      window.removeEventListener('pointerdown', trackTouchStart, true)
      window.removeEventListener('pointerup', trackTouchEnd, true)
      window.removeEventListener('pointercancel', trackTouchEnd, true)
      touchNavigation.reset()
      cancelSelectionGesture()
      exampleController?.abort()
      layoutController?.abort()
      backgroundWorker?.terminate()
      if (frame !== undefined) cancelAnimationFrame(frame)
      map?.getCanvas().removeEventListener('pointerdown', pointerDown, true)
      map?.getCanvas().removeEventListener('dblclick', doubleClick, true)
      map
        ?.getCanvas()
        .removeEventListener('lostpointercapture', cancelMarqueeCapture)
      map?.remove()
    }
  })
</script>

<svelte:window
  onpointermove={pointerMove}
  onpointerup={(event) => finishPointer(event)}
  onpointercancel={(event) => finishPointer(event, true)}
  onkeydown={keyboard}
  onkeyup={(event) => {
    modifier(event)
    if (event.code === 'Space') spaceDown = false
  }}
  onblur={() => {
    spaceDown = false
    altDown = false
    touchNavigation.reset()
    editorTaps.reset()
    tapSelection.cancel()
    finishDrag(undefined, true)
  }}
  ondragover={(event) => {
    event.preventDefault()
    if (
      !selecting &&
      !editingMask &&
      !editingTransform &&
      !editingGroup &&
      !searching
    )
      draggingOver = true
  }}
  ondragleave={(event) => {
    if (!event.relatedTarget) draggingOver = false
  }}
  ondrop={drop}
/>

<main
  class="collage"
  use:buttonTooltips
  class:control-gesture={activeControl !== undefined}
  class:box-selecting={selecting && selectionMode === 'box' && !spaceDown}
  style:--canvas-color={shades.green[0]}
  style:--dot-color={themeColors.green}
  style:--accent={themeColors.pink}
  style:--error-color={themeColors.red}
  style:--group-color={themeColors.darkblue}
>
  {#if map && snapping.grid && !searching}
    <SnapGrid {map} spacing={snapping.spacing * snapUnits[snapping.unit]} />
  {/if}
  <div
    bind:this={container}
    class="map-canvas"
    class:has-snap-grid={snapping.grid && !searching}
    aria-label="Collage canvas"
  ></div>
  {#if !editingMask && !editingTransform && !searching}
    <svg class="outlines" aria-hidden="true">
      {#each overlays as item (item.id)}
        <polygon
          points={item.points}
          class:selected={selectedIds.has(item.id)}
          class:grouped={item.grouped}
          class:failed={!!loadFailures[item.id]?.length}
        />
      {/each}
      {#if marquee?.moved}
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

  {#if map && moveGuide}
    <SnapAxes {map} guide={moveGuide} />
  {/if}

  {#if settingsOpen}
    <ToolSettings
      settings={toolSettings}
      {importTransformation}
      {doubleTapMode}
      ondoubletapchange={changeDoubleTap}
      {snapping}
      onimportchange={changeImport}
      onsnapchange={changeSnapping}
      onchange={changeTools}
      onclose={() => (settingsOpen = false)}
    />
  {/if}

  <header class="app-header">
    <div class="brand">
      <div class="brand-mark"><Logo /></div>
      <h1><strong>Allmaps</strong> <span>Collage</span></h1>
    </div>
    <nav aria-label="Collage actions">
      <button
        class="quiet-button"
        data-tooltip="Find maps"
        aria-label="Find maps by place"
        onclick={search}
        disabled={selecting ||
          !ready ||
          busy ||
          !!editingMask ||
          !!editingTransform ||
          !!editingGroup ||
          searching ||
          !!inputMode}
      >
        <MagnifyingGlass size={20} />
      </button>
      <button
        class="quiet-button"
        data-tooltip="Open collage"
        aria-label="Open collage"
        onclick={() => showInput('open')}
        disabled={selecting ||
          !ready ||
          busy ||
          !!editingMask ||
          !!editingTransform ||
          !!editingGroup ||
          searching}><FolderOpen size={20} /></button
      >
      <ExportMenu
        {map}
        {layer}
        {items}
        {selectedIds}
        disabled={selecting ||
          !items.length ||
          !ready ||
          busy ||
          !!editingMask ||
          !!editingTransform ||
          !!editingGroup ||
          searching ||
          !!inputMode}
        onsave={save}
        onopen={(open) => (exportOpen = open)}
      />
      <button
        class="quiet-button"
        data-tooltip="Settings"
        aria-label="Settings"
        disabled={selecting ||
          busy ||
          !!activeControl ||
          !!editingMask ||
          !!editingTransform ||
          searching ||
          !!inputMode}
        onclick={() => (settingsOpen = true)}><GearSix size={20} /></button
      >
      <button
        class="primary-button small"
        aria-label="Add maps"
        onclick={() => showInput('add')}
        disabled={selecting ||
          !ready ||
          busy ||
          !!editingMask ||
          !!editingTransform ||
          !!editingGroup ||
          searching}
        >{#if busy}<LoadingSmall />{:else}<Plus size={18} />{/if}<span
          >Add maps</span
        ></button
      >
    </nav>
  </header>

  {#if !items.length && !inputMode && !searching}
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
        {#if busy}<LoadingSmall />{:else}<span aria-hidden="true">↗</span
          >{/if}</button
      >
    </section>
  {/if}

  {#if selected && controls && appearances && !locked && !selecting && !inputMode && !editingMask && !editingTransform && !searching && !settingsOpen}
    {#key selection.map((item) => item.instanceId).join(',')}
      {#each allRingTools as tool (tool)}
        {#if ringTools.includes(tool)}
          {#if tool === 'more'}
            <MapControl
              fold={ringFold}
              position={controls.more.position}
              label={ringExpanded ? 'Fewer tools' : 'More tools'}
              expanded={ringExpanded}
              disabled={busy || !!activeControl}
              onclick={toggleRing}
              >{#if ringExpanded}<Minus size={19} />{:else}<Plus
                  size={19}
                />{/if}</MapControl
            >
          {:else if tool === 'move'}
            <MapControl
              fold={ringFold}
              position={controls.move.position}
              label={altDown
                ? 'Duplicate and move'
                : selection.length > 1
                  ? 'Move selected maps'
                  : 'Move map'}
              disabled={busy || locked}
              active={activeControl === 'move'}
              onpointerdown={(event) => beginDrag(event, selected!, 'move')}
              ><ArrowsOutCardinal size={19} /></MapControl
            >
          {:else if tool === 'rotate'}
            <MapControl
              fold={ringFold}
              position={controls.rotate.position}
              label={altDown
                ? 'Make upright'
                : selection.length > 1
                  ? 'Rotate selected maps'
                  : 'Rotate map'}
              disabled={busy || locked}
              active={activeControl === 'rotate'}
              value={Math.round(
                (((selectedRotation * 180) / Math.PI + 540) % 360) - 180
              ) + '°'}
              onpointerdown={(event) => beginDrag(event, selected!, 'rotate')}
              onclick={(event) => {
                if (event.altKey) alignToBearing()
              }}
              onkeydown={(event) => controlKey(event, 'rotate')}
              ondblclick={(event) => {
                if (!event.altKey) resetOrientation()
              }}
              >{#if altDown}<ArrowUp size={19} />{:else}<ArrowClockwise
                  size={19}
                />{/if}</MapControl
            >
          {:else if tool === 'opacity'}
            <MapControl
              fold={ringFold}
              position={controls.opacity.position}
              label="Opacity"
              disabled={busy || locked}
              active={activeControl === 'opacity'}
              sliderValue={appearances.opacity}
              rail={controls.opacity.rail}
              value={Math.round(appearances.opacity * 100) + '%'}
              onpointerdown={(event) => beginDrag(event, selected!, 'opacity')}
              onkeydown={(event) => controlKey(event, 'opacity')}
              ><CircleHalf size={19} /></MapControl
            >
          {:else if tool === 'hue'}
            <MapControl
              fold={ringFold}
              position={controls.hue.position}
              rail={controls.hue.rail}
              hueScale
              label="Colorize"
              disabled={busy || locked}
              pressed={selection.every((item) => item.appearance.colorize)}
              active={activeControl === 'hue'}
              sliderValue={appearances.hue}
              value={hueColor(appearances.hue).toUpperCase()}
              onpointerdown={(event) => beginDrag(event, selected!, 'hue')}
              onkeydown={(event) => controlKey(event, 'hue')}
              ondblclick={toggleColorize}><Palette size={19} /></MapControl
            >
          {:else if tool === 'saturation'}
            <MapControl
              fold={ringFold}
              position={controls.saturation.position}
              label="Saturation"
              disabled={busy || locked}
              pressed={selection.every(
                (item) => item.appearance.saturation === 1
              )}
              onclick={toggleSaturation}><DropHalf size={19} /></MapControl
            >
          {:else if tool === 'background'}
            <MapControl
              fold={ringFold}
              position={controls.background.position}
              label="Remove background"
              disabled={busy || locked}
              pressed={selection.every(
                (item) => item.appearance.removeBackground
              )}
              onclick={toggleBackground}><MagicWand size={19} /></MapControl
            >
          {:else if tool === 'mirror'}
            <MapControl
              fold={ringFold}
              position={controls.mirror.position}
              label={altDown ? 'Mirror vertically' : 'Mirror horizontally'}
              disabled={busy || locked}
              pressed={allMirrored}
              onclick={mirrorSelected}
              >{#if altDown}<FlipVertical size={19} />{:else}<FlipHorizontal
                  size={19}
                />{/if}</MapControl
            >
          {:else if tool === 'editMask'}
            <MapControl
              fold={ringFold}
              position={controls.editMask.position}
              label="Edit mask"
              disabled={busy || locked || selection.length > 1}
              onclick={editMask}><Polygon size={19} /></MapControl
            >
          {:else if tool === 'front'}
            <MapControl
              fold={ringFold}
              position={controls.front.position}
              label={toFront ? 'Bring to front' : 'Send to back'}
              disabled={busy || locked || orderUnchanged}
              onclick={() => changeOrder(toFront)}
              >{#if toFront}<BringMapsToFront />{:else}<SendMapsToBack
                />{/if}</MapControl
            >
          {:else if tool === 'duplicate'}
            <MapControl
              fold={ringFold}
              position={controls.duplicate.position}
              label={selection.length > 1
                ? 'Duplicate selected maps'
                : 'Duplicate map'}
              disabled={busy || locked}
              onclick={duplicate}><Copy size={19} /></MapControl
            >
          {:else if tool === 'openIn'}
            <MapControl
              fold={ringFold}
              position={controls.openIn.position}
              label="Open in Viewer"
              disabled={busy || locked || !viewerLink}
              onclick={() => {
                if (viewerLink)
                  window.open(viewerLink, '_blank', 'noopener,noreferrer')
              }}><ArrowSquareOut size={19} /></MapControl
            >
          {:else if tool === 'remove'}
            <MapControl
              fold={ringFold}
              position={controls.remove.position}
              label={selection.length > 1
                ? 'Remove selected maps'
                : 'Remove map'}
              disabled={busy || locked}
              onclick={removeSelected}><Trash size={19} /></MapControl
            >
          {:else if tool === 'transform'}
            <MapControl
              fold={ringFold}
              position={controls.transform.position}
              label="Transform"
              disabled={busy ||
                locked ||
                selection.some(
                  (item) =>
                    !['helmert', 'polynomial1'].includes(
                      transformationType(item.baseline)
                    )
                )}
              onclick={editTransform}><BoundingBox size={20} /></MapControl
            >
          {/if}
        {/if}
      {/each}
    {/key}
  {/if}

  {#if locked && controlCenter && !selecting && !inputMode && !editingMask && !editingTransform && !searching && !settingsOpen}
    <div
      class="locked-map-indicator"
      role="img"
      aria-label="Locked"
      style:transform={`translate3d(${controlCenter[0]}px, ${controlCenter[1]}px, 0)`}
    >
      <LockSimple size={18} />
    </div>
  {/if}

  {#if !editingMask && !editingTransform && !inputMode && !searching}
    <div
      class="bottom-stack selection-stack"
      class:has-actions={selecting ||
        !!editingGroup ||
        (selection.length > 1 && !locked) ||
        !!layoutController}
    >
      {#if errorMessage}
        <div class="error-message" role="alert">
          <span>{errorMessage}</span><button
            aria-label="Dismiss error"
            onclick={() => (errorMessage = '')}><X size={18} /></button
          >
        </div>
      {/if}
      {#if selecting}
        <div class="selection-actions" role="group" aria-label="Select maps">
          <h2>Select maps</h2>
          <button
            class="quiet-button"
            aria-label="Tap selection"
            data-tooltip="Tap"
            aria-pressed={selectionMode === 'tap'}
            onclick={() => changeSelectionMode('tap')}
            ><HandTap size={20} /></button
          >
          <button
            class="quiet-button"
            aria-label="Box selection"
            data-tooltip="Box"
            aria-pressed={selectionMode === 'box'}
            onclick={() => changeSelectionMode('box')}
            ><Selection size={20} /></button
          >
          <button
            class="quiet-button"
            aria-label="Select all maps"
            data-tooltip="Select all"
            aria-keyshortcuts="Meta+A Control+A"
            disabled={selectedIds.size === visibleItems.length}
            onclick={() => select(visibleItems.map((item) => item.instanceId))}
            ><SelectionAll size={20} /></button
          >
          <button
            class="quiet-button"
            aria-label="Clear selection"
            data-tooltip="Clear"
            disabled={!selectedIds.size}
            onclick={() => select()}><X size={20} /></button
          >
          {#if !editingGroup && !grouped}
            <button
              class="quiet-button"
              aria-label="Group"
              data-tooltip="Group"
              aria-keyshortcuts="Meta+G Control+G"
              disabled={busy || locked || selectedObjectCount < 2 || !!marquee}
              onclick={() => changeGroup()}><FolderSimple size={20} /></button
            >
          {/if}
          {#if editingGroup || selection.some((item) => item.groupId)}
            <button
              class="quiet-button"
              aria-label="Ungroup"
              data-tooltip="Ungroup"
              aria-keyshortcuts="Meta+Shift+G Control+Shift+G"
              disabled={busy ||
                !!marquee ||
                selectionLocked(editingGroup ? visibleItems : selection)}
              onclick={() => changeGroup(true)}
              ><FolderSimpleMinus size={20} /></button
            >
          {/if}
          <button
            class="quiet-button"
            aria-label={locked ? 'Unlock' : 'Lock'}
            data-tooltip={locked ? 'Unlock' : 'Lock'}
            aria-pressed={locked}
            disabled={!selection.length || busy || !!activeControl || !!marquee}
            onclick={toggleLock}
            >{#if locked}<LockSimple size={20} />{:else}<LockSimpleOpen
                size={20}
              />{/if}</button
          >
          <button
            bind:this={selectionDoneButton}
            class="quiet-button"
            aria-label="Done selecting"
            data-tooltip="Done"
            aria-keyshortcuts="Meta+Enter Control+Enter Escape"
            onclick={finishSelecting}><Check size={20} /></button
          >
        </div>
      {:else if editingGroup || layoutAvailable || layoutController}
        <div
          class="selection-actions"
          role="group"
          aria-label={editingGroup ? 'Edit group' : 'Arrange selected maps'}
        >
          <h2>
            {#if layoutController}
              <LoadingSmall />Arranging…
            {:else}
              {editingGroup ? 'Edit group' : 'Edit layout'}
            {/if}
          </h2>
          {#if layoutController}
            <button
              class="quiet-button"
              aria-label="Cancel arrangement"
              data-tooltip="Cancel arrangement"
              onclick={() => layoutController?.abort()}><X size={19} /></button
            >
          {:else}
            {#if layoutAvailable}
              <button
                class="quiet-button"
                aria-label="Arrange selected maps"
                data-tooltip="Arrange compactly"
                disabled={busy}
                onclick={() => organize()}><SquaresFour size={20} /></button
              >
              <button
                class="quiet-button"
                aria-label="Arrange geographically"
                data-tooltip="Arrange geographically"
                disabled={busy ||
                  selection.some((item) => !item.geographicReference)}
                onclick={() => organize('geographic')}
                ><MapTrifold size={20} /></button
              >
              <FanMenu
                label="Align"
                icon={AlignLeft}
                disabled={busy || selectedObjectCount < 2}
                options={[
                  { value: 'top', label: 'Top', icon: AlignTop },
                  { value: 'bottom', label: 'Bottom', icon: AlignBottom },
                  { value: 'left', label: 'Left', icon: AlignLeft },
                  { value: 'right', label: 'Right', icon: AlignRight },
                  {
                    value: 'horizontal',
                    label: 'Horizontal center',
                    icon: AlignCenterHorizontal
                  },
                  {
                    value: 'vertical',
                    label: 'Vertical center',
                    icon: AlignCenterVertical
                  }
                ]}
                onselect={(value) => align(value as Alignment)}
              />
              <FanMenu
                label="Distribute"
                icon={Columns}
                disabled={busy || selectedObjectCount < 2}
                options={[
                  {
                    value: 'horizontal',
                    label: 'Horizontally',
                    icon: Columns,
                    disabled: selectedObjectCount < 3
                  },
                  {
                    value: 'vertical',
                    label: 'Vertically',
                    icon: Rows,
                    disabled: selectedObjectCount < 3
                  },
                  {
                    value: 'space-horizontal',
                    label: 'Space horizontally',
                    icon: ArrowsOutLineHorizontal
                  },
                  {
                    value: 'space-vertical',
                    label: 'Space vertically',
                    icon: ArrowsOutLineVertical
                  }
                ]}
                onselect={(value) => distribute(value as Distribution)}
              />
            {/if}
            {#if editingGroup}
              <button
                class="quiet-button"
                aria-label="Ungroup"
                data-tooltip="Ungroup"
                aria-keyshortcuts="Meta+Shift+G Control+Shift+G"
                disabled={busy ||
                  !!activeControl ||
                  !!marquee ||
                  selectionLocked(visibleItems)}
                onclick={() => changeGroup(true)}
                ><FolderSimpleMinus size={20} /></button
              >
              <button
                class="quiet-button"
                aria-label="Done editing group"
                data-tooltip="Done"
                aria-keyshortcuts="Meta+Enter Control+Enter"
                disabled={busy || !!activeControl}
                onclick={finishGroupEdit}><Check size={20} /></button
              >
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if !editingMask && !editingTransform && !searching}
    <footer class="canvas-footer">
      <div class="view-controls">
        <button
          data-tooltip="Zoom in"
          aria-label="Zoom in"
          onclick={() => map?.zoomIn()}
          disabled={!ready}><Plus size={19} /></button
        >
        <button
          data-tooltip="Zoom out"
          aria-label="Zoom out"
          onclick={() => map?.zoomOut()}
          disabled={!ready}><Minus size={19} /></button
        >
        <button
          data-tooltip={editingGroup ? 'Fit group' : 'Fit collage'}
          aria-label={editingGroup ? 'Fit group' : 'Fit collage'}
          onclick={() => fit()}
          disabled={!items.length}><ArrowsOut size={19} /></button
        >
        <button
          bind:this={selectButton}
          data-tooltip="Select maps"
          aria-label="Select maps"
          aria-pressed={selecting}
          onclick={() => (selecting ? finishSelecting() : startSelecting())}
          disabled={!ready ||
            !visibleItems.length ||
            busy ||
            !!activeControl ||
            !!marquee ||
            !!inputMode ||
            settingsOpen ||
            exportOpen}
          ><SelectionPlus size={19} class="selection-icon" /></button
        >
        <button
          data-tooltip="Undo"
          aria-label="Undo"
          onclick={undo}
          disabled={!past.length || busy || selecting}
          ><ArrowUUpLeft size={19} /></button
        >
        <button
          data-tooltip="Redo"
          aria-label="Redo"
          onclick={redo}
          disabled={!future.length || busy || selecting}
          ><ArrowUUpRight size={19} /></button
        >
      </div>
    </footer>
  {/if}

  <div class="sr-only" role="status" aria-live="polite">
    {layoutController
      ? 'Arranging maps…'
      : busy
        ? 'Loading annotation…'
        : message}
  </div>
  {#if inputMode}
    <div class="modal-backdrop">
      <dialog
        class="input-dialog"
        use:showDialog
        aria-labelledby="input-title"
        oncancel={(event) => {
          event.preventDefault()
          if (layoutController) layoutController.abort()
          else if (!busy) inputMode = undefined
        }}
      >
        <button
          class="close-dialog"
          aria-label="Close"
          onclick={() => {
            layoutController?.abort()
            inputMode = undefined
          }}
          disabled={busy && !layoutController}><X size={22} /></button
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
            >{layoutController
              ? 'Arranging…'
              : busy
                ? 'Loading…'
                : inputMode === 'add'
                  ? 'Add all maps'
                  : 'Open collage'}{#if busy}<LoadingSmall />{:else}<Plus
                size={18}
              />{/if}</button
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

  {#if searching && map && layer}
    {#await import('./SearchMaps.svelte')}
      <div class="bottom-stack" role="status" aria-label="Loading search">
        <LoadingSmall />
      </div>
    {:then search}
      <search.default
        {map}
        {layer}
        {items}
        apiKey={publicEnv.PUBLIC_GEOCODE_EARTH_KEY ?? ''}
        restoreConstrain={constrainCollage}
        onadd={addSearchMaps}
        onclose={() => (searching = false)}
      />
    {:catch}
      <div class="bottom-stack">
        <div class="error-message" role="alert">
          Search could not be loaded. Please try again.
          <button aria-label="Close search" onclick={() => (searching = false)}
            ><X size={18} /></button
          >
        </div>
      </div>
    {/await}
  {/if}

  {#if editingTransform && map && layer}
    <TransformEditor
      selection={editingTransform}
      {snapping}
      {map}
      {layer}
      {items}
      onpreview={(draft) => draft.forEach(updateRaster)}
      ondone={saveTransform}
      oncancel={() => {
        editingTransform = undefined
        refresh()
      }}
    />
  {/if}

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
