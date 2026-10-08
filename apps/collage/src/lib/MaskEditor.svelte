<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { Map as MapLibreMap } from 'maplibre-gl'
  import type { WarpedMapLayer } from '@allmaps/maplibre'
  import {
    TerraDraw,
    TerraDrawPolygonMode,
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
    Check,
    X
  } from 'phosphor-svelte'
  import { fullResourceMask, validateResourceMask } from './model'
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
  let drawingNewMask = $state(false)
  let drawingUndoCount = $state(0)
  let drawingRedoCount = $state(0)
  let draft = $state.raw<Point[]>(structuredClone(original.resourceMask))
  let past = $state.raw<Point[][]>([])
  let future = $state.raw<Point[][]>([])
  let ready = $state(false)
  let error = $state('')
  let changing = false
  let edgeStart: { index: number; point: Point } | undefined

  const { toGeo, toResource } = maskCoordinates(original)
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
    draw.updateModeOptions<typeof TerraDrawSelectMode>('select', {
      styles: {
        selectedPolygonOutlineColor: color,
        selectionPointOutlineColor: color,
        midPointOutlineColor: color
      }
    })
  })

  function refreshDrawingHistory() {
    drawingUndoCount = polygonMode?.undoSize() ?? 0
    drawingRedoCount = polygonMode?.redoSize() ?? 0
  }

  function showDraft() {
    if (!draw) return
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
    } finally {
      changing = false
    }
  }

  function cancelNewMask() {
    drawingNewMask = false
    showDraft()
    refreshDrawingHistory()
    error = ''
  }

  function drawNewMask() {
    if (!draw || !ready) return
    if (drawingNewMask) return cancelNewMask()
    edgeStart = undefined
    draw.setMode('static')
    draw.clear()
    drawingNewMask = true
    draw.setMode('polygon')
    refreshDrawingHistory()
    error = ''
  }

  function finished(id: string | number) {
    if (!drawingNewMask) return edited()
    const feature = draw?.getSnapshotFeature(id)
    if (feature?.geometry.type !== 'Polygon') return
    try {
      const next = feature.geometry.coordinates[0]
        .slice(0, -1)
        .map((p) => toResource(p as Point))
      validateResourceMask(next, width, height)
      past = [...past.slice(-39), draft]
      future = []
      draft = next
      drawingNewMask = false
      showDraft()
      error = ''
    } catch (problem) {
      cancelNewMask()
      error = problem instanceof Error ? problem.message : String(problem)
    }
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
    }

    override onDragStart(
      event: TerraDrawMouseEvent,
      setDraggability: (enabled: boolean) => void
    ) {
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
    if (drawingNewMask) {
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
          bottom: map.getContainer().clientWidth <= 760 ? 145 : 85,
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
      event.key.toLowerCase() === 's'
    ) {
      event.preventDefault()
      if (ready && !drawingNewMask) ondone(draft)
    }
  }

  onMount(() => {
    const camera = { center: map.getCenter(), zoom: map.getZoom() }
    const visibility = items.map((other) => ({
      id: other.instanceId,
      visible: layer.getWarpedMap(other.instanceId)?.visible ?? true
    }))
    const doubleClickZoom = map.doubleClickZoom.isEnabled()
    try {
      map.stop()
      map.doubleClickZoom.disable()
      for (const other of items) {
        layer.setMapOptions(
          other.instanceId,
          {
            visible: other.instanceId === original.instanceId
          },
          { animate: false }
        )
      }
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
      draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map,
          coordinatePrecision: 32,
          ignoreMismatchedPointerEvents: true
        }),
        modes: [
          polygonMode,
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
      map.getCanvas().addEventListener('pointerdown', edgePointerDown, true)
      fit()
      ready = true
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
    return () => {
      ready = false
      map.getCanvas().removeEventListener('pointerdown', edgePointerDown, true)
      draw?.stop()
      for (const other of visibility) {
        layer.setMapOptions(
          other.id,
          { visible: other.visible },
          { animate: false }
        )
      }
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
<section class="mask-editor" aria-label="Mask editor">
  <div class="mask-editor-actions">
    <h2>{drawingNewMask ? 'Draw mask' : 'Edit mask'}</h2>
    <button
      class="quiet-button"
      class:pressed={drawingNewMask}
      aria-pressed={drawingNewMask}
      aria-label={drawingNewMask ? 'Cancel new mask' : 'Draw new mask'}
      title={drawingNewMask
        ? 'Cancel new mask (Escape)'
        : 'Draw new mask · Click points, then the first point or Enter to finish'}
      disabled={!ready}
      onclick={drawNewMask}><Polygon size={20} /></button
    >
    <button
      class="quiet-button"
      title="Cancel mask editing (Escape)"
      aria-label="Cancel mask editing"
      onclick={oncancel}><X size={20} /></button
    >
    <button
      class="primary-button small"
      disabled={!ready || drawingNewMask}
      onclick={() => ondone(draft)}><Check size={18} />Done</button
    >
  </div>
  <div class="canvas-footer">
    <div class="view-controls">
      <button
        aria-label="Zoom in"
        title="Zoom in"
        disabled={!ready}
        onclick={() => map.zoomIn()}><Plus size={19} /></button
      >
      <button
        aria-label="Zoom out"
        title="Zoom out"
        disabled={!ready}
        onclick={() => map.zoomOut()}><Minus size={19} /></button
      >
      <button
        aria-label="Fit map"
        title="Fit map"
        disabled={!ready}
        onclick={fit}><ArrowsOut size={19} /></button
      >
      <button
        aria-label="Undo mask edit"
        title="Undo mask edit (⌘/Ctrl Z)"
        disabled={drawingNewMask ? !drawingUndoCount : !past.length}
        onclick={undo}><ArrowUUpLeft size={19} /></button
      >
      <button
        aria-label="Redo mask edit"
        title="Redo mask edit (⌘/Ctrl Shift Z)"
        disabled={drawingNewMask ? !drawingRedoCount : !future.length}
        onclick={redo}><ArrowUUpRight size={19} /></button
      >
    </div>
  </div>
  <p class="sr-only">
    Drag vertices to edit. Drag any mask edge to add a vertex. Right-click a
    vertex to remove it. Vertices stop at the image boundary. Done saves; Escape
    cancels. Draw new mask replaces the polygon after you click its first point
    or press Enter. Escape cancels an unfinished drawing.
  </p>
  {#if error}<div class="error-message" role="alert">{error}</div>{/if}
</section>
