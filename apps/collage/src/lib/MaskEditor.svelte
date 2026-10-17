<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import type { Map as MapLibreMap } from 'maplibre-gl'
  import type { WarpedMapLayer } from '@allmaps/maplibre'
  import {
    TerraDraw,
    TerraDrawPolygonMode,
    TerraDrawFreehandMode,
    TerraDrawSelectMode
  } from 'terra-draw'
  import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
  import { themeColors } from '@allmaps/tailwind'
  import {
    Plus,
    Minus,
    ArrowsOut,
    ArrowUUpLeft,
    ArrowUUpRight,
    Polygon,
    PencilSimple,
    SelectionAll,
    Circle,
    Rectangle,
    FrameCorners,
    Parallelogram,
    Cursor,
    ArrowCounterClockwise,
    Check,
    Eye,
    EyeSlash,
    X
  } from 'phosphor-svelte'
  import FanMenu from './FanMenu.svelte'
  import { modeVisibility } from './mode-visibility'
  import {
    drawMaskCircle,
    drawMaskRectangle,
    moveMask,
    maskContains
  } from './mask-shapes'
  import { fullResourceMask, validateResourceMask } from './model'
  import { simplifyMaskStroke } from './freehand-mask'
  import { suspendMapNavigation } from './map-navigation'
  import { PenTouchGesture } from './pen-gesture'
  import { MaskVertexTaps } from './mask-tap'
  import { TouchDoubleTap } from './double-tap'
  import { bindMaskStylus } from './mask-stylus'
  import {
    constrainToImage,
    maskCoordinates,
    maskEdgeAt
  } from './mask-geometry'
  import type { CollageMap } from './model'
  import type { Point } from '@allmaps/types'
  import type { GeoJSONStoreFeatures, TerraDrawMouseEvent } from 'terra-draw'

  let {
    item,
    failed = false,
    map,
    layer,
    items,
    ondone,
    oncancel
  }: {
    item: CollageMap
    failed?: boolean
    map: MapLibreMap
    layer: WarpedMapLayer
    items: CollageMap[]
    ondone: (mask: Point[]) => void
    oncancel: () => void
  } = $props()

  // This mode edits a private draft on the existing map. Done is one collage undo step; Cancel
  // leaves the map, GCPs, camera and original annotation untouched.
  const original = untrack(() => structuredClone(item))
  const width = original.baseline.resource.width!
  const height = original.baseline.resource.height!
  const featureId = crypto.randomUUID()
  let draw = $state.raw<TerraDraw>()
  let polygonMode: TerraDrawPolygonMode | undefined
  let freehandMode: MaskFreehandMode | undefined
  type DrawingMode = 'polygon' | 'freehand' | 'circle' | 'rectangle'
  let drawingMode = $state<DrawingMode>()
  type ShapeOrientation = 'view' | 'map'
  let shapeOrientation = $state<ShapeOrientation>('view')
  const drawingShape = $derived(
    drawingMode === 'circle' || drawingMode === 'rectangle'
  )
  const drawingOptions = [
    { value: 'edit', label: 'Edit points', icon: Cursor },
    { value: 'polygon', label: 'Polygon', icon: Polygon },
    { value: 'freehand', label: 'Pen', icon: PencilSimple },
    { value: 'circle', label: 'Circle', icon: Circle },
    { value: 'rectangle', label: 'Rectangle', icon: Rectangle }
  ]
  const drawingNewMask = $derived(drawingMode !== undefined)
  let drawingUndoCount = $state(0)
  let drawingRedoCount = $state(0)
  let draft = $state.raw<Point[]>(structuredClone(original.resourceMask))
  let past = $state.raw<Point[][]>([])
  let future = $state.raw<Point[][]>([])
  let ready = $state(false)
  let showOthers = $state(false)
  let visibility: ReturnType<typeof modeVisibility> | undefined
  let error = $state('')
  let changing = false
  let edgeStart: { index: number; point: Point } | undefined
  let restoreNavigation: (() => void) | undefined
  let penPointerType = 'mouse'
  const penTouches = new PenTouchGesture()
  const vertexTaps = new MaskVertexTaps()
  const outsideTaps = new TouchDoubleTap<boolean>()
  let ignoreOutsideDoubleClickUntil = 0
  let penAnchor: Point | undefined
  let adapter: MaskMapAdapter | undefined

  const { toGeo, toResource } = maskCoordinates(original, true)
  const geometry = (mask: Point[]) => ({
    type: 'Polygon' as const,
    coordinates: [[...mask, mask[0]].map(toGeo)]
  })

  $effect(() => {
    if (!ready || !draw) return
    const color = failed ? themeColors.red : themeColors.pink
    draw.updateModeOptions<typeof TerraDrawPolygonMode>('polygon', {
      styles: {
        outlineColor: color,
        closingPointOutlineColor: color,
        coordinatePointOutlineColor: color,
        snappingPointOutlineColor: color
      }
    })
    draw.updateModeOptions<typeof TerraDrawFreehandMode>('freehand', {
      styles: { outlineColor: color, closingPointOutlineColor: color }
    })
    draw.updateModeOptions<typeof TerraDrawSelectMode>('select', {
      styles: {
        selectedPolygonOutlineColor: color,
        selectionPointOutlineColor: color,
        midPointOutlineColor: color
      }
    })
  })

  function refreshDrawingHistory() {
    drawingUndoCount =
      drawingMode === 'polygon' ? (polygonMode?.undoSize() ?? 0) : 1
    drawingRedoCount =
      drawingMode === 'polygon' ? (polygonMode?.redoSize() ?? 0) : 0
  }

  function showDraft() {
    if (!draw) return
    penTouches.reset()
    vertexTaps.reset()
    penAnchor = undefined
    changing = true
    try {
      draw.setMode('static')
      draw.clear()
      const result = draw.addFeatures([
        {
          type: 'Feature',
          id: featureId,
          geometry: geometry(draft),
          properties: { mode: 'polygon' }
        }
      ])
      if (!result[0]?.valid)
        throw new Error(result[0]?.reason ?? 'This mask cannot be edited.')
      draw.setMode('select')
      draw.selectFeature(featureId)
      releaseNavigation()
    } finally {
      changing = false
    }
  }

  function cancelNewMask() {
    abortMaskGesture()
    drawingMode = undefined
    showDraft()
    refreshDrawingHistory()
    error = ''
  }

  function drawNewMask(mode: DrawingMode) {
    if (!draw || !ready) return
    if (drawingMode === mode) return cancelNewMask()
    abortMaskGesture()
    releaseNavigation()
    penTouches.reset()
    vertexTaps.reset()
    penAnchor = undefined
    edgeStart = undefined
    draw.setMode('static')
    draw.clear()
    drawingMode = mode
    draw.setMode(mode === 'circle' || mode === 'rectangle' ? 'static' : mode)
    refreshDrawingHistory()
    error = ''
  }

  function chooseDrawingTool(value: string) {
    if (value === 'edit') cancelNewMask()
    else drawNewMask(value as DrawingMode)
  }

  function resetMask() {
    if (!ready || drawingNewMask) return
    abortMaskGesture()
    replaceDraft(
      structuredClone(
        original.originalResourceMask ?? original.baseline.resourceMask
      )
    )
  }

  function finished(id: string | number) {
    if (!drawingNewMask) return edited()
    const feature = draw?.getSnapshotFeature(id)
    if (feature?.geometry.type !== 'Polygon') return
    try {
      let next = feature.geometry.coordinates[0]
        .slice(0, -1)
        .map((p) => toResource(p as Point))
      if (drawingMode === 'freehand')
        next = simplifyMaskStroke(next, width, height, (p) => {
          const screen = map.project(toGeo(p))
          return [screen.x, screen.y]
        })
      validateResourceMask(next, width, height)
      past = [...past.slice(-39), draft]
      future = []
      draft = next
      drawingMode = undefined
      showDraft()
      error = ''
    } catch (problem) {
      cancelNewMask()
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }

  function replaceDraft(next: Point[]) {
    validateResourceMask(next, width, height)
    if (JSON.stringify(next) === JSON.stringify(draft)) return
    past = [...past.slice(-39), draft]
    future = []
    draft = next
    syncDraft()
    error = ''
  }

  function fullMask() {
    if (!ready || drawingNewMask) return
    abortMaskGesture()
    replaceDraft(fullResourceMask(original.baseline))
  }

  // Terra Draw handles pen gestures and polygon creation; keep input inside the
  // image just like vertex dragging. Simplify in screen pixels on completion.
  class MaskFreehandMode extends TerraDrawFreehandMode {
    private from: Point = [width / 2, height / 2]
    private draggingStroke = false

    get penPosition(): Point {
      return toGeo(this.from)
    }

    private constrain(event: TerraDrawMouseEvent): TerraDrawMouseEvent {
      try {
        this.from = constrainToImage(
          this.from,
          toResource([event.lng, event.lat], this.from),
          width,
          height
        )
      } catch {
        /* Keep the last invertible point on nonlinear maps. */
      }
      const [lng, lat] = toGeo(this.from)
      const screen = map.project([lng, lat])
      return { ...event, lng, lat, containerX: screen.x, containerY: screen.y }
    }

    override onClick(event: TerraDrawMouseEvent) {
      // A touch tap has no hover phase. Only a drag should start a touch stroke.
      if (penPointerType !== 'mouse') return
      restoreNavigation ??= suspendMapNavigation(map)
      super.onClick(this.constrain(event))
    }
    override onMouseMove(event: TerraDrawMouseEvent) {
      super.onMouseMove(this.constrain(event))
    }
    override onDragStart(
      event: TerraDrawMouseEvent,
      setDraggability: (enabled: boolean) => void
    ) {
      this.draggingStroke = this.state !== 'drawing'
      setDraggability(false)
      if (this.draggingStroke) this.from = [width / 2, height / 2]
      super.onDragStart(this.constrain(event), setDraggability)
    }
    override onDrag(
      event: TerraDrawMouseEvent,
      setDraggability: (enabled: boolean) => void
    ) {
      const constrained = this.constrain(event)
      if (this.draggingStroke) super.onDrag(constrained, setDraggability)
      else super.onMouseMove(constrained)
    }

    override onDragEnd(
      event: TerraDrawMouseEvent,
      setDraggability: (enabled: boolean) => void
    ) {
      // Some tablets deliver the final pen position only with pointerup.
      if (this.draggingStroke)
        super.onDrag(this.constrain(event), setDraggability)
      super.onDragEnd(event, setDraggability)
      // Terra Draw leaves an invalid, too-short stroke unfinished. Restore the
      // previous draft instead of trapping the user in a completed gesture.
      if (this.draggingStroke && this.state === 'drawing') {
        cancelNewMask()
        error = 'Draw a closed area with the pen.'
      }
      this.draggingStroke = false
    }
  }

  class MaskMapAdapter extends TerraDrawMapLibreGLAdapter<MapLibreMap> {
    preparePointer(event: PointerEvent) {
      // Allow finger jitter before a tap becomes a drag, or a second finger
      // starts native navigation instead of accidentally starting a stroke.
      const distance =
        event.pointerType === 'touch' ||
        (event.pointerType === 'pen' && drawingMode === 'polygon')
          ? 8
          : 1
      this._minPixelDragDistanceSelecting = distance
      this._minPixelDragDistance = distance
      this._minPixelDragDistanceDrawing = Math.max(8, distance)
    }

    resetPenGesture() {
      this._dragState = 'not-dragging'
      this._lastDrawEvent = undefined
    }

    override setDraggability(enabled: boolean) {
      // Keep the lock only during a stroke, including its paused pinch phase.
      super.setDraggability(enabled && !restoreNavigation)
    }
  }

  function releaseNavigation() {
    const restore = restoreNavigation
    restoreNavigation = undefined
    restore?.()
  }

  // Both shapes use the chosen drawing plane, but masks are always stored in
  // image coordinates. Terra Draw renders and edits the resulting vertices.
  type MaskGesture = {
    kind: 'circle' | 'rectangle' | 'move'
    orientation: ShapeOrientation
    pointer: number
    anchor: Point
    screen: Point
    mask: Point[]
    next?: Point[]
  }
  let maskGesture: MaskGesture | undefined
  const maskTouches = new SvelteSet<number>()
  let navigatingTouches = false
  let suppressMaskClick = false

  function pointerScreen(
    event: Pick<MouseEvent, 'clientX' | 'clientY'>
  ): Point {
    const rect = map.getCanvas().getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function screenResource(point: Point): Point {
    const geo = map.unproject(point)
    return toResource([geo.lng, geo.lat])
  }

  function resourceScreen(point: Point): Point {
    const screen = map.project(toGeo(point))
    return [screen.x, screen.y]
  }

  function pointerResource(
    event: Pick<MouseEvent, 'clientX' | 'clientY'>
  ): Point {
    return screenResource(pointerScreen(event))
  }

  function abortMaskGesture() {
    if (!maskGesture) return
    maskGesture = undefined
    releaseNavigation()
    adapter?.resetPenGesture()
    showDraft()
  }

  function cancelMaskNavigation() {
    abortMaskGesture()
    maskTouches.clear()
    navigatingTouches = false
  }

  function maskPointerDown(event: PointerEvent) {
    suppressMaskClick = false
    if (drawingMode === 'polygon' || drawingMode === 'freehand') return
    if (event.pointerType === 'touch') {
      maskTouches.add(event.pointerId)
      if (maskTouches.size > 1) {
        navigatingTouches = true
        abortMaskGesture()
      }
    }
    if (navigatingTouches) {
      event.stopImmediatePropagation()
      return
    }
    if (!ready || event.button !== 0) return
    try {
      const anchor = pointerResource(event)
      const shape = drawingMode === 'circle' || drawingMode === 'rectangle'
      if (!shape) {
        const rect = map.getCanvas().getBoundingClientRect()
        if (
          vertexAt(event) !== undefined ||
          edgeAt([event.clientX - rect.left, event.clientY - rect.top]) ||
          !maskContains(draft, anchor)
        )
          return
      }
      maskGesture = {
        kind: shape ? (drawingMode as 'circle' | 'rectangle') : 'move',
        orientation: shapeOrientation,
        pointer: event.pointerId,
        anchor: [
          Math.max(0, Math.min(width, anchor[0])),
          Math.max(0, Math.min(height, anchor[1]))
        ],
        screen: [event.clientX, event.clientY],
        mask: structuredClone(draft)
      }
      edgeStart = undefined
      vertexTaps.reset()
      adapter?.resetPenGesture()
      restoreNavigation ??= suspendMapNavigation(map)
      draw!.setMode('static')
      if (shape) draw!.clear()
      map.getCanvas().setPointerCapture(event.pointerId)
      suppressMaskClick = true
      event.preventDefault()
      event.stopImmediatePropagation()
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }

  function maskPointerMove(event: PointerEvent) {
    if (navigatingTouches) {
      event.stopImmediatePropagation()
      return
    }
    const gesture = maskGesture
    if (!gesture || gesture.pointer !== event.pointerId) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (
      Math.hypot(
        event.clientX - gesture.screen[0],
        event.clientY - gesture.screen[1]
      ) < (event.pointerType === 'touch' ? 8 : 2)
    )
      return
    try {
      const point = pointerResource(event)
      const drawShape =
        gesture.kind === 'rectangle' ? drawMaskRectangle : drawMaskCircle
      const followMap = gesture.orientation === 'map'
      const next =
        gesture.kind === 'move'
          ? moveMask(
              gesture.mask,
              [point[0] - gesture.anchor[0], point[1] - gesture.anchor[1]],
              width,
              height
            )
          : drawShape(
              followMap ? gesture.anchor : resourceScreen(gesture.anchor),
              followMap ? point : pointerScreen(event),
              width,
              height,
              followMap ? undefined : screenResource
            )
      validateResourceMask(next, width, height)
      gesture.next = next
      if (draw!.getSnapshotFeature(featureId))
        draw!.updateFeatureGeometry(featureId, geometry(next))
      else
        draw!.addFeatures([
          {
            type: 'Feature',
            id: featureId,
            geometry: geometry(next),
            properties: { mode: 'polygon' }
          }
        ])
    } catch {
      // A zero-size starting shape is unfinished, not an invalid edit.
    }
  }

  function maskPointerUp(event: PointerEvent) {
    const wasNavigating = navigatingTouches
    maskTouches.delete(event.pointerId)
    if (!maskTouches.size) navigatingTouches = false
    if (wasNavigating) {
      event.stopImmediatePropagation()
      return
    }
    const gesture = maskGesture
    if (!gesture || gesture.pointer !== event.pointerId) return
    maskPointerMove(event)
    maskGesture = undefined
    releaseNavigation()
    adapter?.resetPenGesture()
    drawingMode = undefined
    showDraft()
    if (gesture.next) replaceDraft(gesture.next)
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function maskPointerCancel(event: PointerEvent) {
    maskTouches.delete(event.pointerId)
    if (!maskTouches.size) navigatingTouches = false
    abortMaskGesture()
  }

  function maskTouch(event: TouchEvent) {
    if (!maskGesture) return
    if (event.cancelable) event.preventDefault()
    event.stopImmediatePropagation()
  }

  function maskClick(event: MouseEvent) {
    if (suppressMaskClick) {
      suppressMaskClick = false
      event.stopImmediatePropagation()
    }
  }

  function penPointerDown(event: PointerEvent) {
    if (drawingMode !== 'freehand' || event.button !== 0) return
    const transition = penTouches.start(
      event,
      freehandMode?.state === 'drawing'
    )
    if (transition === 'pinch') penAnchor = freehandMode!.penPosition
    if (transition === 'navigate') {
      // No stroke yet: let MapLibre handle normal two-finger panning/zooming.
      adapter?.resetPenGesture()
      releaseNavigation()
    }
    if (penTouches.pinching || penTouches.navigating) {
      event.stopImmediatePropagation()
    } else if (event.isPrimary) {
      penPointerType = event.pointerType
      adapter?.preparePointer(event)
      // Acquire before the first touchstart/mousedown reaches MapLibre, so the
      // map cannot pan under a new stroke. Merely selecting Pen does not lock it.
      restoreNavigation ??= suspendMapNavigation(map)
    }
    map.getCanvas().setPointerCapture(event.pointerId)
  }

  function penPointerMove(event: PointerEvent) {
    if (drawingMode !== 'freehand') return
    const change = penTouches.move(event)
    if (change && penAnchor) {
      map.zoomTo(map.getZoom() + change.zoomDelta, {
        around: penAnchor,
        duration: 0
      })
      // Keep the last drawn point under the drawing finger when both fingers
      // move, so resuming does not insert a jump into the outline.
      if (change.pan[0] || change.pan[1]) map.panBy(change.pan, { duration: 0 })
    }
    if (penTouches.pinching || penTouches.navigating)
      event.stopImmediatePropagation()
  }

  function penPointerUp(event: PointerEvent) {
    if (drawingMode !== 'freehand') return
    if (penTouches.end(event)) event.stopImmediatePropagation()
    if (!penTouches.pinching) penAnchor = undefined
    // Terra Draw finishes the original pointer's stroke after this capture
    // listener. A tap or the last navigation finger should release the lock too.
    queueMicrotask(() => {
      if (!penTouches.hasPointers && freehandMode?.state !== 'drawing')
        releaseNavigation()
    })
  }

  function penPointerCancel(event: PointerEvent) {
    if (drawingMode !== 'freehand') return
    const suppress = penTouches.end(event)
    event.stopImmediatePropagation()
    if (!penTouches.pinching) penAnchor = undefined
    if (!suppress) {
      adapter?.resetPenGesture()
      cancelNewMask()
    }
  }

  function penTouch(event: TouchEvent) {
    if (drawingMode !== 'freehand' || freehandMode?.state !== 'drawing') return
    // MapLibre consumes TouchEvents, independently of Terra Draw's PointerEvents.
    // During a stroke our pinch uses the pen point, not the fingers' midpoint.
    // Between strokes the normal MapLibre handlers receive these events.
    if (event.cancelable) event.preventDefault()
    event.stopImmediatePropagation()
  }

  function vertexAt(event: Pick<MouseEvent, 'clientX' | 'clientY'>) {
    const rect = map.getCanvas().getBoundingClientRect()
    const x = event.clientX - rect.left,
      y = event.clientY - rect.top
    let closest: number | undefined
    let distance = 20
    draft.forEach((point, index) => {
      const screen = map.project(toGeo(point))
      const next = Math.hypot(x - screen.x, y - screen.y)
      if (next <= distance) {
        closest = index
        distance = next
      }
    })
    return closest
  }

  function outsideMask(event: MouseEvent | PointerEvent) {
    if (!ready || drawingNewMask || maskGesture || navigatingTouches)
      return false
    // Leave the vertex/edge hit areas to editing, even just outside the polygon.
    if (vertexAt(event) !== undefined || edgeAt(pointerScreen(event)))
      return false
    try {
      return !maskContains(draft, pointerResource(event))
    } catch {
      return false
    }
  }

  function outsideDoubleClick(event: MouseEvent) {
    // Touch browsers can emit dblclick after the second pointerup. A vertex
    // just removed may now be outside the new polygon; do not close for it.
    if (performance.now() < ignoreOutsideDoubleClickUntil) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (!outsideMask(event)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    ondone(draft)
  }

  function outsidePointerDown(event: PointerEvent) {
    outsideTaps.start(event, outsideMask(event) ? true : undefined)
  }
  function outsidePointerMove(event: PointerEvent) {
    outsideTaps.move(event)
  }
  function outsidePointerUp(event: PointerEvent) {
    if (!outsideTaps.end(event, outsideMask(event) ? true : undefined)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    ondone(draft)
  }
  function resetOutsideTaps() {
    outsideTaps.reset()
  }

  function vertexPointerDown(event: PointerEvent) {
    if (!drawingNewMask) {
      adapter?.preparePointer(event)
      vertexTaps.start(event, vertexAt(event))
    }
  }

  function vertexPointerMove(event: PointerEvent) {
    vertexTaps.move(event)
  }

  function vertexPointerUp(event: PointerEvent) {
    if (drawingNewMask) return
    const index = vertexTaps.end(event, vertexAt(event))
    if (index === undefined) return
    ignoreOutsideDoubleClickUntil = performance.now() + 500
    event.stopImmediatePropagation()
    edgeStart = undefined
    adapter?.resetPenGesture()
    adapter?.setDraggability(true)
    try {
      replaceDraft(draft.filter((_, i) => i !== index))
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }

  function vertexPointerCancel() {
    vertexTaps.reset()
  }

  function syncDraft(mask = draft) {
    if (!draw) return
    changing = true
    try {
      draw.deselectFeature(featureId)
      draw.updateFeatureGeometry(featureId, geometry(mask))
      draw.selectFeature(featureId)
    } finally {
      changing = false
    }
  }

  function edgeAt(pointer: Point) {
    return maskEdgeAt(
      draft.map((point) => {
        const screen = map.project(toGeo(point))
        return [screen.x, screen.y]
      }),
      pointer
    )
  }

  function edgePointerDown(event: PointerEvent) {
    edgeStart = undefined
    if (event.button !== 0 || drawingNewMask) return
    const rect = map.getCanvas().getBoundingClientRect()
    const edge = edgeAt([event.clientX - rect.left, event.clientY - rect.top])
    if (!edge) return
    const a = draft[edge.index],
      b = draft[(edge.index + 1) % draft.length]
    const seed: Point = [
      a[0] + (b[0] - a[0]) * edge.fraction,
      a[1] + (b[1] - a[1]) * edge.fraction
    ]
    try {
      const geo = map.unproject(edge.position)
      edgeStart = {
        index: edge.index + 1,
        point: constrainToImage(
          seed,
          toResource([geo.lng, geo.lat], seed),
          width,
          height
        )
      }
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }

  class MaskSelectMode extends TerraDrawSelectMode {
    override onMouseMove(event: TerraDrawMouseEvent) {
      super.onMouseMove(event)
      if (edgeAt([event.containerX, event.containerY]))
        map.getCanvas().style.cursor = 'copy'
      else {
        try {
          const nearVertex = draft.some((point) => {
            const p = map.project(toGeo(point))
            return (
              Math.hypot(p.x - event.containerX, p.y - event.containerY) <= 12
            )
          })
          if (
            !nearVertex &&
            maskContains(draft, toResource([event.lng, event.lat]))
          )
            map.getCanvas().style.cursor = 'move'
        } catch {
          /* Folded surfaces have no usable inverse here. */
        }
      }
    }

    override onDragStart(
      event: TerraDrawMouseEvent,
      setDraggability: (enabled: boolean) => void
    ) {
      vertexTaps.reset()
      const edge = edgeStart
      edgeStart = undefined
      if (edge) {
        const next = [...draft]
        next.splice(edge.index, 0, edge.point)
        try {
          validateResourceMask(next, width, height)
          // Insert only once a drag starts. Leave draft/history unchanged until
          // Terra Draw finishes dragging the new vertex: one gesture, one undo.
          syncDraft(next)
          const [lng, lat] = toGeo(edge.point)
          const screen = map.project([lng, lat])
          super.onDragStart(
            { ...event, lng, lat, containerX: screen.x, containerY: screen.y },
            setDraggability
          )
          super.onDrag(event, setDraggability)
          return
        } catch (problem) {
          error = problem instanceof Error ? problem.message : String(problem)
          syncDraft()
        }
      }
      super.onDragStart(event, setDraggability)
    }
  }

  function edited() {
    if (!draw || changing) return
    const feature = draw.getSnapshotFeature(featureId)
    if (feature?.geometry.type !== 'Polygon') return
    try {
      const next = feature.geometry.coordinates[0]
        .slice(0, -1)
        .map((p) => toResource(p as Point))
      validateResourceMask(next, width, height)
      if (JSON.stringify(next) !== JSON.stringify(draft)) {
        past = [...past.slice(-39), draft]
        future = []
        draft = next
      }
      error = ''
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
      syncDraft()
    }
  }

  function undo() {
    abortMaskGesture()
    if (drawingNewMask) {
      if (drawingMode !== 'polygon') return cancelNewMask()
      polygonMode?.undo()
      refreshDrawingHistory()
      return
    }
    if (!past.length) return
    future = [...future, draft]
    draft = past.at(-1)!
    past = past.slice(0, -1)
    syncDraft()
    error = ''
  }

  function redo() {
    abortMaskGesture()
    if (drawingNewMask) {
      polygonMode?.redo()
      refreshDrawingHistory()
      return
    }
    if (!future.length) return
    past = [...past, draft]
    draft = future.at(-1)!
    future = future.slice(0, -1)
    syncDraft()
    error = ''
  }

  function fit() {
    const points = fullResourceMask(original.baseline).flatMap(
      (a, i, corners) => {
        const b = corners[(i + 1) % corners.length]
        // Include curved image edges when fitting a nonlinear warp.
        return Array.from({ length: 33 }, (_, step) =>
          toGeo([
            a[0] + ((b[0] - a[0]) * step) / 32,
            a[1] + ((b[1] - a[1]) * step) / 32
          ])
        )
      }
    )
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
        padding: {
          top: 85,
          bottom:
            map.getContainer().clientWidth <= (drawingShape ? 1024 : 960)
              ? 145
              : 85,
          left: 55,
          right: 55
        },
        duration: 400
      }
    )
  }

  function keyboard(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (drawingNewMask) cancelNewMask()
      else oncancel()
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'z'
    ) {
      event.preventDefault()
      event.stopPropagation()
      if (event.shiftKey) redo()
      else undo()
    } else if (
      (event.ctrlKey || event.metaKey) &&
      (event.key.toLowerCase() === 's' || event.key === 'Enter')
    ) {
      event.preventDefault()
      event.stopPropagation()
      if (ready && !drawingNewMask) ondone(draft)
    }
  }

  onMount(() => {
    const camera = { center: map.getCenter(), zoom: map.getZoom() }
    visibility = modeVisibility(
      layer,
      items.map((other) => other.instanceId),
      original.instanceId
    )
    const doubleClickZoom = map.doubleClickZoom.isEnabled()
    const canvas = map.getCanvas()
    // Establish touch-action before contact: changing it midway through a
    // Pencil stroke is too late to stop the browser taking over that gesture.
    const touchAction = canvas.style.touchAction
    canvas.style.touchAction = 'none'
    const unbindStylus = bindMaskStylus(canvas, window, {
      start: (event) => {
        adapter?.preparePointer(event)
        restoreNavigation ??= suspendMapNavigation(map)
      },
      end: releaseNavigation,
      cancel: () => {
        adapter?.resetPenGesture()
        edgeStart = undefined
        if (drawingNewMask) cancelNewMask()
        else {
          abortMaskGesture()
          showDraft()
        }
      },
      allowTouch: () => drawingMode === 'freehand'
    })
    try {
      map.stop()
      map.doubleClickZoom.disable()
      visibility.showOthers(showOthers)
      layer.setMapOptions(
        original.instanceId,
        {
          applyMask: false,
          opacity: 1,
          removeColor: false
        },
        { animate: false }
      )
      // Attach Editor's drawing tools to the existing MapLibre surface.
      polygonMode = new TerraDrawPolygonMode({
        keyEvents: { cancel: null, finish: 'Enter' },
        showCoordinatePoints: true,
        pointerDistance: 12,
        snapping: {
          toCustom: (event, context) => {
            const snapshot = context.getCurrentGeometrySnapshot()
            const last =
              snapshot?.type === 'Polygon'
                ? (snapshot.coordinates[0][
                    Math.max(0, (context.currentCoordinate ?? 1) - 1)
                  ] as Point)
                : undefined
            try {
              const from: Point = last
                ? toResource(last)
                : [width / 2, height / 2]
              return toGeo(
                constrainToImage(
                  from,
                  toResource([event.lng, event.lat], from),
                  width,
                  height
                )
              )
            } catch {
              return last
            }
          }
        },
        validation: (feature, context) => {
          if (
            context.updateType !== 'finish' ||
            feature.geometry.type !== 'Polygon'
          )
            return { valid: true }
          try {
            validateResourceMask(
              feature.geometry.coordinates[0]
                .slice(0, -1)
                .map((p) => toResource(p as Point)),
              width,
              height
            )
            error = ''
            return { valid: true }
          } catch (problem) {
            error = problem instanceof Error ? problem.message : String(problem)
            return { valid: false, reason: error }
          }
        },
        styles: {
          fillColor: '#ffffff',
          fillOpacity: 0.15,
          outlineColor: themeColors.pink,
          outlineWidth: 5,
          closingPointColor: '#ffffff',
          closingPointOutlineColor: themeColors.pink,
          coordinatePointColor: '#ffffff',
          coordinatePointOutlineColor: themeColors.pink,
          coordinatePointWidth: 4,
          coordinatePointOutlineWidth: 3
        }
      })
      adapter = new MaskMapAdapter({
        map,
        coordinatePrecision: 32,
        ignoreMismatchedPointerEvents: true
      })
      freehandMode = new MaskFreehandMode({
        drawInteraction: 'click-move-or-drag',
        keyEvents: { cancel: null, finish: 'Enter' },
        minDistance: 4,
        smoothing: 0,
        preventPointsNearClose: true,
        styles: {
          fillColor: '#ffffff',
          fillOpacity: 0.15,
          outlineColor: themeColors.pink,
          outlineWidth: 5,
          closingPointColor: '#ffffff',
          closingPointOutlineColor: themeColors.pink,
          closingPointWidth: 4,
          closingPointOutlineWidth: 3
        }
      })
      draw = new TerraDraw({
        adapter,
        modes: [
          polygonMode,
          freehandMode,
          new MaskSelectMode({
            pointerDistance: 12,
            allowManualDeselection: false,
            allowManualSelection: false,
            keyEvents: {
              deselect: null,
              delete: null,
              rotate: null,
              scale: null
            },
            flags: {
              polygon: {
                feature: {
                  draggable: false,
                  selfIntersectable: false,
                  coordinates: {
                    draggable: true,
                    snappable: {
                      toCustom: (event, context) => {
                        const ring = context.getCurrentGeometrySnapshot()
                        const current =
                          ring?.type === 'Polygon'
                            ? (ring.coordinates[0][
                                context.currentCoordinate ?? 0
                              ] as Point)
                            : undefined
                        if (!current) return
                        try {
                          const from = toResource(current)
                          const next = toResource([event.lng, event.lat], from)
                          return toGeo(
                            constrainToImage(from, next, width, height)
                          )
                        } catch {
                          return current
                        }
                      }
                    },
                    deletable: true,
                    midpoints: { draggable: true }
                  }
                }
              }
            },
            styles: {
              selectedPolygonColor: '#ffffff',
              selectedPolygonFillOpacity: 0.15,
              selectedPolygonOutlineColor: themeColors.pink,
              selectedPolygonOutlineWidth: 5,
              selectionPointWidth: 4,
              selectionPointColor: '#ffffff',
              selectionPointOutlineColor: themeColors.pink,
              selectionPointOutlineWidth: 3,
              midPointWidth: 3,
              midPointColor: '#ffffff',
              midPointOutlineColor: themeColors.pink,
              midPointOutlineWidth: 2,
              midPointOpacity: 0.65
            }
          })
        ]
      })
      draw.start()
      const feature: GeoJSONStoreFeatures = {
        type: 'Feature',
        id: featureId,
        geometry: geometry(draft),
        properties: { mode: 'polygon' }
      }
      const result = draw.addFeatures([feature])
      if (!result[0]?.valid)
        throw new Error(
          result[0]?.reason ?? 'This mask cannot be edited as a single polygon.'
        )
      draw.setMode('select')
      draw.selectFeature(featureId)
      draw.on('finish', finished)
      draw.on('change', () =>
        queueMicrotask(() => {
          if (ready) refreshDrawingHistory()
        })
      )
      canvas.addEventListener('dblclick', outsideDoubleClick, true)
      canvas.addEventListener('pointerdown', outsidePointerDown, true)
      canvas.addEventListener('pointermove', outsidePointerMove, true)
      canvas.addEventListener('pointerup', outsidePointerUp, true)
      canvas.addEventListener('pointercancel', resetOutsideTaps, true)
      window.addEventListener('blur', resetOutsideTaps)
      map.on('movestart', resetOutsideTaps)
      canvas.addEventListener('pointerdown', maskPointerDown, true)
      canvas.addEventListener('pointermove', maskPointerMove, true)
      canvas.addEventListener('pointerup', maskPointerUp, true)
      canvas.addEventListener('pointercancel', maskPointerCancel, true)
      canvas.addEventListener('click', maskClick, true)
      window.addEventListener('blur', cancelMaskNavigation)
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
        canvas.addEventListener(type, maskTouch as EventListener, {
          capture: true,
          passive: false
        })
      canvas.addEventListener('pointerdown', vertexPointerDown, true)
      canvas.addEventListener('pointermove', vertexPointerMove, true)
      canvas.addEventListener('pointerup', vertexPointerUp, true)
      canvas.addEventListener('pointercancel', vertexPointerCancel, true)
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
        canvas.addEventListener(type, penTouch as EventListener, {
          capture: true,
          passive: false
        })
      map.getCanvas().addEventListener('pointerdown', edgePointerDown, true)
      map.getCanvas().addEventListener('pointerdown', penPointerDown, true)
      map.getCanvas().addEventListener('pointermove', penPointerMove, true)
      map.getCanvas().addEventListener('pointerup', penPointerUp, true)
      map.getCanvas().addEventListener('pointercancel', penPointerCancel, true)
      ready = true
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
    return () => {
      ready = false
      unbindStylus()
      canvas.removeEventListener('dblclick', outsideDoubleClick, true)
      canvas.removeEventListener('pointerdown', outsidePointerDown, true)
      canvas.removeEventListener('pointermove', outsidePointerMove, true)
      canvas.removeEventListener('pointerup', outsidePointerUp, true)
      canvas.removeEventListener('pointercancel', resetOutsideTaps, true)
      window.removeEventListener('blur', resetOutsideTaps)
      map.off('movestart', resetOutsideTaps)
      resetOutsideTaps()
      canvas.removeEventListener('pointerdown', maskPointerDown, true)
      canvas.removeEventListener('pointermove', maskPointerMove, true)
      canvas.removeEventListener('pointerup', maskPointerUp, true)
      canvas.removeEventListener('pointercancel', maskPointerCancel, true)
      canvas.removeEventListener('click', maskClick, true)
      window.removeEventListener('blur', cancelMaskNavigation)
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
        canvas.removeEventListener(type, maskTouch as EventListener, true)
      canvas.removeEventListener('pointerdown', vertexPointerDown, true)
      canvas.removeEventListener('pointermove', vertexPointerMove, true)
      canvas.removeEventListener('pointerup', vertexPointerUp, true)
      canvas.removeEventListener('pointercancel', vertexPointerCancel, true)
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
        canvas.removeEventListener(type, penTouch as EventListener, true)
      map.getCanvas().removeEventListener('pointerdown', edgePointerDown, true)
      map.getCanvas().removeEventListener('pointerdown', penPointerDown, true)
      map.getCanvas().removeEventListener('pointermove', penPointerMove, true)
      map.getCanvas().removeEventListener('pointerup', penPointerUp, true)
      map
        .getCanvas()
        .removeEventListener('pointercancel', penPointerCancel, true)
      releaseNavigation()
      canvas.style.touchAction = touchAction
      penTouches.reset()
      vertexTaps.reset()
      draw?.stop()
      map.dragPan.enable()
      visibility?.restore()
      layer.setMapOptions(
        original.instanceId,
        {
          applyMask: original.appearance.applyMask,
          opacity: original.appearance.opacity,
          removeColor:
            original.appearance.removeBackground &&
            !!original.appearance.backgroundColor
        },
        { animate: false }
      )
      if (doubleClickZoom) map.doubleClickZoom.enable()
      map.easeTo({ ...camera, duration: 400 })
    }
  })
</script>

<svelte:window onkeydown={keyboard} />
<section
  class="mask-editor"
  class:drawing-shape={drawingShape}
  aria-label="Mask editor"
>
  <div class="bottom-stack mask-editor-stack">
    {#if error}<div class="error-message" role="alert">{error}</div>{/if}
    <div class="mask-editor-actions">
      <h2>
        {drawingMode === 'freehand'
          ? 'Draw with pen'
          : drawingMode === 'circle'
            ? 'Draw circle'
            : drawingMode === 'rectangle'
              ? 'Draw rectangle'
              : drawingNewMask
                ? 'Draw mask'
                : 'Edit mask'}
      </h2>
      <button
        class="quiet-button"
        aria-label={showOthers ? 'Hide other maps' : 'Show other maps'}
        data-tooltip={showOthers ? 'Hide other maps' : 'Show other maps'}
        aria-pressed={!showOthers}
        disabled={!ready}
        onclick={() => {
          showOthers = !showOthers
          visibility?.showOthers(showOthers)
        }}
        >{#if showOthers}<Eye size={20} />{:else}<EyeSlash
            size={20}
          />{/if}</button
      >
      <button
        class="quiet-button"
        aria-label="Full image mask"
        data-tooltip="Full image mask"
        disabled={!ready || drawingNewMask}
        onclick={fullMask}><SelectionAll size={20} /></button
      >
      <FanMenu
        label="Drawing tools"
        value={drawingMode ?? 'edit'}
        options={drawingOptions}
        disabled={!ready}
        onselect={chooseDrawingTool}
      />
      {#if drawingShape}
        <FanMenu
          label="Shape orientation"
          value={shapeOrientation}
          options={[
            { value: 'view', label: 'Follow view', icon: FrameCorners },
            { value: 'map', label: 'Follow map', icon: Parallelogram }
          ]}
          disabled={!ready}
          onselect={(value) => (shapeOrientation = value as ShapeOrientation)}
        />
      {/if}
      <button
        class="quiet-button"
        aria-label="Reset mask"
        data-tooltip="Reset mask"
        disabled={!ready || drawingNewMask}
        onclick={resetMask}><ArrowCounterClockwise size={20} /></button
      >
      <button
        class="quiet-button"
        data-tooltip="Cancel"
        aria-label="Cancel mask editing"
        onclick={oncancel}><X size={20} /></button
      >
      <button
        class="quiet-button"
        aria-label="Done"
        data-tooltip="Done"
        aria-keyshortcuts="Meta+Enter Control+Enter"
        disabled={!ready || drawingNewMask}
        onclick={() => ondone(draft)}><Check size={20} /></button
      >
    </div>
  </div>
  <div class="canvas-footer">
    <div class="view-controls">
      <button
        aria-label="Zoom in"
        data-tooltip="Zoom in"
        disabled={!ready}
        onclick={() => map.zoomIn()}><Plus size={19} /></button
      >
      <button
        aria-label="Zoom out"
        data-tooltip="Zoom out"
        disabled={!ready}
        onclick={() => map.zoomOut()}><Minus size={19} /></button
      >
      <button
        aria-label="Fit map"
        data-tooltip="Fit map"
        disabled={!ready}
        onclick={fit}><ArrowsOut size={19} /></button
      >
      <button
        aria-label="Undo mask edit"
        data-tooltip="Undo"
        disabled={drawingNewMask ? !drawingUndoCount : !past.length}
        onclick={undo}><ArrowUUpLeft size={19} /></button
      >
      <button
        aria-label="Redo mask edit"
        data-tooltip="Redo"
        disabled={drawingNewMask ? !drawingRedoCount : !future.length}
        onclick={redo}><ArrowUUpRight size={19} /></button
      >
    </div>
  </div>
  <p class="sr-only">
    Drag inside the mask to move it. Drag vertices to edit. Drag any mask edge
    to add a vertex. Right-click a vertex or double-tap it on touch screens to
    remove it. Vertices stop at the image boundary. Done or ⌘/Ctrl Enter saves;
    Escape cancels. Draw new mask replaces the polygon after you click its first
    point or press Enter. The pen draws a freehand polygon and simplifies the
    stroke. Release to finish, or click to start and finish. Full image mask
    restores the image bounds. Reset mask restores the imported original mask.
    Circle draws from its center; rectangle draws from corner to corner. Shape
    orientation lets both follow the current view or the map's rotation and
    skew. Both stop at the image edges. Escape cancels an unfinished drawing.
  </p>
</section>
