<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { Map as MapLibreMap } from 'maplibre-gl'
  import type { WarpedMapLayer } from '@allmaps/maplibre'
  import type { Point } from '@allmaps/types'
  import {
    Check,
    X,
    Eraser,
    Rectangle,
    Plus,
    Minus,
    ArrowsOut,
    ArrowUUpLeft,
    ArrowUUpRight,
    Cube,
    ArrowDownLeft,
    ArrowDownRight,
    Eye,
    EyeSlash,
    LinkSimple,
    LinkSimpleBreak
  } from 'phosphor-svelte'
  import { bounds } from './geometry'
  import { exportView } from './export-view'
  import { toCanvasGeo, fromCanvasGeo, CANVAS_ZOOM_OFFSET } from './coordinates'
  import {
    applyMatrix,
    invertMatrix,
    dragTransform,
    snapTransform
  } from './affine-transform'
  import {
    createSelectionTransform,
    setMapTransform,
    resetSelectionTransform,
    makeSelectionIsometric,
    rotatePlacement,
    bearingRotation,
    fullResourceMask,
    placedMap,
    transformer,
    outline
  } from './model'
  import type { CollageMap } from './model'
  import { suspendMapNavigation } from './map-navigation'
  import { TouchNavigation } from './touch-navigation'
  import { snapRotation } from './rotation'
  import { createMoveSnapper } from './move-snapping'
  import type { SnapSettings, AxisGuide } from './move-snapping'
  import SnapAxes from './SnapAxes.svelte'
  import { modeVisibility } from './mode-visibility'
  import FanMenu from './FanMenu.svelte'

  let {
    selection,
    map,
    layer,
    items,
    snapping,
    onpreview,
    ondone,
    oncancel
  }: {
    selection: CollageMap[]
    map: MapLibreMap
    layer: WarpedMapLayer
    items: CollageMap[]
    snapping: SnapSettings
    onpreview: (draft: CollageMap[]) => void
    ondone: (draft: CollageMap[]) => void
    oncancel: () => void
  } = $props()
  const original = untrack(() => structuredClone(selection))
  type Session = ReturnType<typeof createSelectionTransform>
  type Snapshot = { session: Session; draft: CollageMap }
  const initialSession = createSelectionTransform(original)
  const initial = initialSession.frame
  const hasPolynomial = initialSession
    .apply(initial)
    .some((item) => item.affine!.polynomial)
  let session = $state.raw(initialSession)
  let draft = $state.raw(initial)
  let revision = $state(0)
  let past = $state.raw<Snapshot[]>([])
  let future = $state.raw<Snapshot[]>([])
  let error = $state('')
  let active = $state(false)
  let activeKind = $state<Kind>()
  let moveGuide = $state.raw<AxisGuide>()
  let isometricAlternate = false
  const isometricOptions = [
    { value: 'left', label: 'Tilt left', icon: ArrowDownLeft },
    { value: 'right', label: 'Tilt right', icon: ArrowDownRight }
  ]
  let showOthers = $state(false)
  let lockProportions = $state(true)
  let visibility: ReturnType<typeof modeVisibility> | undefined
  let accepted = false
  let restoreNavigation: (() => void) | undefined
  let animation: number | undefined
  let latest: PointerEvent | undefined
  const touches = new TouchNavigation()
  type Kind = 'scale' | 'skew' | 'move' | 'rotate'
  type Handle = { direction: Point; label: string }
  const handles: Handle[] = [
    { direction: [-1, -1], label: 'Scale top left' },
    { direction: [0, -1], label: 'Scale Y top' },
    { direction: [1, -1], label: 'Scale top right' },
    { direction: [1, 0], label: 'Scale X right' },
    { direction: [1, 1], label: 'Scale bottom right' },
    { direction: [0, 1], label: 'Scale Y bottom' },
    { direction: [-1, 1], label: 'Scale bottom left' },
    { direction: [-1, 0], label: 'Scale X left' }
  ]
  const edges = [handles[1], handles[3], handles[5], handles[7]]
  const corners = handles.filter(
    ({ direction }) => direction[0] && direction[1]
  )
  const frame = $derived.by(() => {
    void revision
    const mask =
      draft.appearance.applyMask ||
      !draft.baseline.resource.width ||
      !draft.baseline.resource.height
        ? draft.resourceMask
        : fullResourceMask(draft.baseline)
    const box = bounds(mask)
    const resources: Point[] = [
      [box[0], box[1]],
      [box[2], box[1]],
      [box[2], box[3]],
      [box[0], box[3]]
    ]
    const world = transformer(placedMap(draft)).transformToProjectedGeo(
      resources
    )
    const screen = world.map((p): Point => {
      const q = map.project(toCanvasGeo(p))
      return [q.x, q.y]
    })
    return {
      box,
      world,
      screen,
      size: [box[2] - box[0], box[3] - box[1]] as Point
    }
  })
  const values = $derived(draft.affine!.values)
  let gesture:
    | {
        pointer: number
        target: HTMLElement
        before: CollageMap
        start: Point
        snapMove?: ReturnType<typeof createMoveSnapper>
        inverse: ReturnType<typeof invertMatrix>
        direction: Point
        kind: Kind
        anchor: Point
        size: Point
        pivot: Point
        angle: number
        rotation: number
        rotated: boolean
        bearing: number
      }
    | undefined

  function position(direction: Point): Point {
    const [a, b, , d] = frame.screen
    return [
      a[0] +
        ((b[0] - a[0]) * (direction[0] + 1)) / 2 +
        ((d[0] - a[0]) * (direction[1] + 1)) / 2,
      a[1] +
        ((b[1] - a[1]) * (direction[0] + 1)) / 2 +
        ((d[1] - a[1]) * (direction[1] + 1)) / 2
    ]
  }
  function worldAt(event: PointerEvent): Point {
    const rect = map.getCanvas().getBoundingClientRect()
    return worldPoint([event.clientX - rect.left, event.clientY - rect.top])
  }
  function worldPoint(screen: Point): Point {
    const p = map.unproject(screen)
    return fromCanvasGeo([p.lng, p.lat])
  }
  function pivot(): Point {
    const [a, , c] = frame.world
    return [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]
  }
  function rotationPosition(direction: Point): Point {
    const point = position(direction)
    const center = position([0, 0])
    const dx = point[0] - center[0],
      dy = point[1] - center[1]
    const length = Math.hypot(dx, dy) || 1
    return [point[0] + (36 * dx) / length, point[1] + (36 * dy) / length]
  }
  function anchorFor(direction: Point): Point {
    const [left, top, right, bottom] = frame.box
    return [
      (left + right) / 2 - (direction[0] * (right - left)) / 2,
      (top + bottom) / 2 - (direction[1] * (bottom - top)) / 2
    ]
  }
  function preview(next: CollageMap, nextSession = session) {
    onpreview(nextSession.apply(next))
    session = nextSession
    draft = next
    error = ''
  }
  function remember(before: CollageMap, beforeSession = session) {
    if (
      beforeSession === session &&
      JSON.stringify(before) === JSON.stringify(draft)
    )
      return
    past = [...past.slice(-39), { session: beforeSession, draft: before }]
    future = []
  }
  function preset(next: CollageMap[]) {
    const before = draft
    const beforeSession = session
    const nextSession = createSelectionTransform(next)
    preview(nextSession.frame, nextSession)
    remember(before, beforeSession)
  }
  function start(event: PointerEvent, direction: Point, kind: Kind) {
    if (event.button !== 0 || gesture || touches.active) return
    event.preventDefault()
    event.stopPropagation()
    map.stop()
    const [a, b, , d] = frame.world
    const origin = pivot()
    const pointer = worldAt(event)
    gesture = {
      pointer: event.pointerId,
      target: event.currentTarget as HTMLElement,
      before: structuredClone(draft),
      start: pointer,
      snapMove:
        kind === 'move' && (snapping.grid || snapping.axes)
          ? createMoveSnapper(
              session.apply(draft).flatMap(outline),
              snapping,
              exportView(map).metersPerPixel
            )
          : undefined,
      inverse: invertMatrix([
        [b[0] - a[0], b[1] - a[1]],
        [d[0] - a[0], d[1] - a[1]]
      ]),
      direction,
      kind,
      anchor: anchorFor(direction),
      size: frame.size,
      pivot: origin,
      angle: Math.atan2(pointer[1] - origin[1], pointer[0] - origin[0]),
      rotation: draft.placement.rotation,
      rotated: false,
      bearing: kind === 'rotate' ? bearingRotation(draft) : 0
    }
    restoreNavigation = suspendMapNavigation(map)
    gesture.target.setPointerCapture(event.pointerId)
    active = true
    activeKind = kind
    moveGuide = gesture.snapMove?.guide
  }
  function update(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointer || touches.active)
      return
    const current = worldAt(event)
    const delta = applyMatrix(gesture.inverse, [
      current[0] - gesture.start[0],
      current[1] - gesture.start[1]
    ])
    try {
      const next = structuredClone(gesture.before)
      if (gesture.kind === 'move') {
        const movement: Point = [
          current[0] - gesture.start[0],
          current[1] - gesture.start[1]
        ]
        const move = gesture.snapMove?.(movement) ?? movement
        moveGuide = gesture.snapMove?.guide
        next.placement.position = [
          next.placement.position[0] + move[0],
          next.placement.position[1] + move[1]
        ]
        placedMap(next)
        preview(next)
        return
      }
      if (gesture.kind === 'rotate') {
        const angle = Math.atan2(
          current[1] - gesture.pivot[1],
          current[0] - gesture.pivot[0]
        )
        const step = Math.atan2(
          Math.sin(angle - gesture.angle),
          Math.cos(angle - gesture.angle)
        )
        gesture.rotation += step
        gesture.rotated ||= Math.abs(step) > 1e-8
        gesture.angle = angle
        if (!gesture.rotated) return
        const rotation = snapRotation(
          gesture.rotation,
          gesture.bearing,
          event.shiftKey,
          snapping.rotation ? snapping.rotationStep : undefined
        )
        next.placement = rotatePlacement(
          next.placement,
          gesture.pivot,
          rotation - next.placement.rotation
        )
        placedMap(next)
        preview(next)
        return
      }
      const proportional = lockProportions || event.shiftKey
      const values = dragTransform(
        next.affine!.values,
        gesture.size,
        delta,
        gesture.direction,
        gesture.kind,
        proportional
      )
      setMapTransform(
        next,
        snapTransform(
          values,
          next.affine!.values,
          next.affine!.imported,
          gesture.kind,
          proportional
        ),
        gesture.anchor
      )
      preview(next)
    } catch (problem) {
      // Keep the last valid frame rather than crossing a degenerate matrix.
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }
  function move(event: PointerEvent) {
    if (!gesture || gesture.pointer !== event.pointerId) return
    latest = event
    if (animation === undefined)
      animation = requestAnimationFrame(() => {
        animation = undefined
        if (latest) update(latest)
      })
  }
  function finish(cancel = false, event?: PointerEvent) {
    if (!gesture || (event && event.pointerId !== gesture.pointer)) return
    if (animation !== undefined) cancelAnimationFrame(animation)
    animation = undefined
    if (!cancel && (event ?? latest)) update((event ?? latest)!)
    const completed = gesture
    gesture = undefined
    latest = undefined
    active = false
    activeKind = undefined
    moveGuide = undefined
    restoreNavigation?.()
    restoreNavigation = undefined
    if (completed.target.hasPointerCapture(completed.pointer))
      completed.target.releasePointerCapture(completed.pointer)
    if (cancel) preview(completed.before)
    else remember(completed.before)
  }
  function reset(zero = false) {
    finish()
    try {
      preset(resetSelectionTransform(session.apply(draft), zero))
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }
  function isometric(alternate = false) {
    finish()
    try {
      const center = position([0, 0])
      const a = worldPoint(center)
      const b = worldPoint([center[0] + 100, center[1]])
      preset(
        makeSelectionIsometric(
          session.apply(draft),
          Math.atan2(b[1] - a[1], b[0] - a[0]),
          alternate
        )
      )
      isometricAlternate = alternate
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }
  function toggleOthers() {
    showOthers = !showOthers
    visibility?.showOthers(showOthers)
  }
  function undo(redo = false) {
    finish(true)
    const stack = redo ? future : past
    if (!stack.length) return
    const next = stack.at(-1)!
    if (redo) {
      past = [...past, { session, draft }]
      future = future.slice(0, -1)
    } else {
      future = [...future, { session, draft }]
      past = past.slice(0, -1)
    }
    preview(next.draft, next.session)
  }
  function done() {
    finish()
    accepted = true
    ondone(
      session === initialSession &&
        JSON.stringify(draft) === JSON.stringify(initial)
        ? original
        : session.apply(draft)
    )
  }
  function handleKey(event: KeyboardEvent, direction: Point, kind: Kind) {
    const axis = ['ArrowLeft', 'ArrowRight'].includes(event.key)
      ? 0
      : ['ArrowUp', 'ArrowDown'].includes(event.key)
        ? 1
        : -1
    if (axis === -1) return
    event.preventDefault()
    event.stopPropagation()
    const delta: Point = [0, 0]
    delta[axis] =
      (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) *
      (event.shiftKey ? 0.05 : 0.01)
    try {
      const before = structuredClone(draft)
      const next = structuredClone(draft)
      if (kind === 'move') {
        const center = position([0, 0])
        const a = worldPoint(center)
        const b = worldPoint([
          center[0] + delta[0] * 500,
          center[1] + delta[1] * 500
        ])
        next.placement.position = [
          next.placement.position[0] + b[0] - a[0],
          next.placement.position[1] + b[1] - a[1]
        ]
        placedMap(next)
      } else if (kind === 'rotate') {
        next.placement = rotatePlacement(
          next.placement,
          pivot(),
          (-(delta[axis] < 0 ? -1 : 1) * (event.shiftKey ? 15 : 1) * Math.PI) /
            180
        )
        placedMap(next)
      } else
        setMapTransform(
          next,
          dragTransform(
            values,
            frame.size,
            delta,
            direction,
            kind,
            lockProportions || event.shiftKey
          ),
          anchorFor(direction)
        )
      preview(next)
      remember(before)
    } catch (problem) {
      error = problem instanceof Error ? problem.message : String(problem)
    }
  }
  function keyboard(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (gesture) finish(true)
      else oncancel()
    } else if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      done()
    } else if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'z'
    ) {
      event.preventDefault()
      undo(event.shiftKey)
    }
  }
  function fit() {
    const points = outline(draft).map(toCanvasGeo)
    const box = bounds(points)
    map.fitBounds(
      [
        [box[0], box[1]],
        [box[2], box[3]]
      ],
      {
        padding: { top: 110, bottom: 150, left: 55, right: 55 },
        maxZoom: 18 + CANVAS_ZOOM_OFFSET,
        duration: 250
      }
    )
  }
  function attachSurface(node: HTMLDivElement) {
    // Keep native wheel and pinch events in MapLibre's canvas container. Only
    // an active one-pointer edit suspends navigation.
    map.getCanvasContainer().append(node)
    return { destroy: () => node.remove() }
  }
  onMount(() => {
    visibility = modeVisibility(
      layer,
      items.map((other) => other.instanceId),
      original.map((item) => item.instanceId)
    )
    visibility.showOthers(showOthers)
    const refresh = () => revision++
    const touchStart = (event: PointerEvent) => {
      if (touches.start(event)) finish(true)
    }
    const end = (event: PointerEvent) => {
      finish(false, event)
      touches.end(event)
    }
    const cancel = (event: PointerEvent) => {
      finish(true, event)
      touches.end(event)
    }
    const blur = () => {
      finish(true)
      touches.reset()
    }
    map.on('move', refresh)
    map.on('resize', refresh)
    window.addEventListener('pointerdown', touchStart, true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', blur)
    return () => {
      finish(true)
      map.off('move', refresh)
      map.off('resize', refresh)
      window.removeEventListener('pointerdown', touchStart, true)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', blur)
      if (!accepted) onpreview(original)
      visibility?.restore()
    }
  })
</script>

<svelte:window onkeydown={keyboard} />
<section class="mask-editor transform-editor" aria-label="Transform editor">
  {#if moveGuide}
    <SnapAxes {map} guide={moveGuide} />
  {/if}
  <div
    class="transform-surface"
    class:rotating={activeKind === 'rotate'}
    use:attachSurface
  >
    <svg class="transform-frame" aria-hidden="true">
      <polygon points={frame.screen.map((p) => p.join(',')).join(' ')} />
    </svg>
    <button
      class="transform-move"
      aria-label="Move map"
      data-tooltip=""
      style:clip-path={'polygon(' +
        frame.screen.map((p) => p[0] + 'px ' + p[1] + 'px').join(',') +
        ')'}
      onpointerdown={(event) => start(event, [0, 0], 'move')}
      onkeydowncapture={(event) => handleKey(event, [0, 0], 'move')}
    ></button>
    {#each corners as corner (corner.label)}
      {@const point = rotationPosition(corner.direction)}
      <button
        class="transform-rotate"
        aria-label={corner.label.replace('Scale', 'Rotate')}
        data-tooltip=""
        style:left={point[0] + 'px'}
        style:top={point[1] + 'px'}
        onpointerdown={(event) => start(event, corner.direction, 'rotate')}
        onkeydowncapture={(event) =>
          handleKey(event, corner.direction, 'rotate')}
      ></button>
    {/each}
    {#each edges as edge, i (edge.label)}
      {@const a = frame.screen[i]}
      {@const b = frame.screen[(i + 1) % 4]}
      {@const length = Math.hypot(b[0] - a[0], b[1] - a[1])}
      <button
        class="transform-edge"
        aria-label={'Skew ' + ['top', 'right', 'bottom', 'left'][i]}
        data-tooltip="Skew"
        style:left={(a[0] + b[0]) / 2 + 'px'}
        style:top={(a[1] + b[1]) / 2 + 'px'}
        style:width={Math.max(0, length - 44) + 'px'}
        style:transform={'translate(-50%, -50%) rotate(' +
          Math.atan2(b[1] - a[1], b[0] - a[0]) +
          'rad)'}
        onpointerdown={(event) => start(event, edge.direction, 'skew')}
        onkeydowncapture={(event) => handleKey(event, edge.direction, 'skew')}
      ></button>
    {/each}
    {#each handles as handle (handle.label)}
      {@const point = position(handle.direction)}
      <button
        class="transform-handle"
        class:axis-handle={!handle.direction[0] || !handle.direction[1]}
        aria-label={handle.label}
        data-tooltip={handle.label}
        style:left={point[0] + 'px'}
        style:top={point[1] + 'px'}
        onpointerdown={(event) => start(event, handle.direction, 'scale')}
        onkeydowncapture={(event) =>
          handleKey(event, handle.direction, 'scale')}
      ></button>
    {/each}
  </div>
  <div class="bottom-stack mask-editor-stack">
    {#if error}<div class="error-message" role="alert">{error}</div>{/if}
    {#if active && activeKind !== 'move'}<output class="transform-readout"
        >{#if activeKind === 'rotate'}{Math.round(
            (draft.placement.rotation * 180) / Math.PI
          )}°{:else}X {Math.round(values.scaleX * 100)}% · Y {Math.round(
            values.scaleY * 100
          )}% · {Math.round((Math.atan(values.skewX) * 180) / Math.PI)}° / {Math.round(
            (Math.atan(values.skewY) * 180) / Math.PI
          )}°{/if}</output
      >{/if}
    <div class="mask-editor-actions">
      <h2>Transform</h2>
      <button
        class="quiet-button"
        aria-label={showOthers ? 'Hide other maps' : 'Show other maps'}
        data-tooltip={showOthers ? 'Hide other maps' : 'Show other maps'}
        aria-pressed={!showOthers}
        onclick={toggleOthers}
        >{#if showOthers}<Eye size={20} />{:else}<EyeSlash
            size={20}
          />{/if}</button
      >
      <button
        class="quiet-button proportions-lock"
        aria-label="Lock proportions"
        data-tooltip={lockProportions
          ? 'Unlock proportions'
          : 'Lock proportions'}
        aria-pressed={lockProportions}
        disabled={active}
        onclick={() => (lockProportions = !lockProportions)}
        >{#if lockProportions}<LinkSimple size={20} />{:else}<LinkSimpleBreak
            size={20}
          />{/if}</button
      >
      <FanMenu
        label="Isometric"
        icon={Cube}
        options={isometricOptions}
        onselect={(value) => isometric(value === 'right')}
        onaltclick={() => isometric(!isometricAlternate)}
      />
      <button
        class="quiet-button"
        aria-label="Reset transform"
        data-tooltip="Reset"
        onclick={() => reset()}><Eraser size={20} /></button
      >
      {#if hasPolynomial}
        <button
          class="quiet-button"
          aria-label="Reset transform to zero"
          data-tooltip="Reset to zero"
          onclick={() => reset(true)}><Rectangle size={20} /></button
        >
      {/if}
      <button
        class="quiet-button"
        aria-label="Cancel transform"
        data-tooltip="Cancel"
        onclick={oncancel}><X size={20} /></button
      >
      <button
        class="quiet-button"
        aria-label="Done"
        data-tooltip="Done"
        aria-keyshortcuts="Meta+Enter Control+Enter"
        onclick={done}><Check size={20} /></button
      >
    </div>
  </div>
  <div class="canvas-footer">
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
      <button aria-label="Fit map" data-tooltip="Fit map" onclick={fit}
        ><ArrowsOut size={19} /></button
      >
      <button
        aria-label="Undo transform"
        data-tooltip="Undo"
        disabled={!past.length}
        onclick={() => undo()}><ArrowUUpLeft size={19} /></button
      >
      <button
        aria-label="Redo transform"
        data-tooltip="Redo"
        disabled={!future.length}
        onclick={() => undo(true)}><ArrowUUpRight size={19} /></button
      >
    </div>
  </div>
  <p class="sr-only">
    Proportions are locked by default for corner and midpoint scale handles.
    Unlock proportions to scale axes independently, or hold Shift to temporarily
    retain proportions while unlocked. Drag edges to skew. Drag inside to move,
    or outside a corner to rotate. Rotation snapping uses the angle step in
    Settings when enabled. Otherwise, hold Shift to rotate in 15-degree steps.
    Isometric aligns the selection to a 30-degree plane while keeping its area.
    Alt or Option chooses the opposite isometric direction. Reset restores
    imported scale and skew for one map, or the layout before the shared
    transformation for a selection, including after reopening Transform mode.
    Reset to zero removes skew and restores uniform scale while preserving area.
    Escape cancels; Command or Control Enter saves.
  </p>
</section>

<style>
  .proportions-lock[aria-pressed='true'] {
    background: var(--accent);
  }
  .transform-surface {
    --rotation-cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='none' stroke='%23fff' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 12a10 10 0 0 1 18 0M7 12V5m0 7h7M25 20a10 10 0 0 1-18 0m18 0v7m0-7h-7'/%3E%3C/g%3E%3Cg fill='none' stroke='%23222' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 12a10 10 0 0 1 18 0M7 12V5m0 7h7M25 20a10 10 0 0 1-18 0m18 0v7m0-7h-7'/%3E%3C/g%3E%3C/svg%3E")
        16 16,
      crosshair;
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .transform-frame {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .transform-frame polygon {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .transform-edge,
  .transform-handle,
  .transform-move,
  .transform-rotate {
    position: absolute;
    pointer-events: auto;
    touch-action: none;
    padding: 0;
    border: 0;
    background: transparent;
  }
  .transform-move {
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: grab;
  }
  .transform-move:active {
    cursor: grabbing;
  }
  .transform-move:focus-visible {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .transform-rotate {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    cursor: var(--rotation-cursor);
  }
  .transform-rotate:focus-visible {
    outline: 2px solid var(--accent);
  }
  .transform-surface.rotating,
  .transform-surface.rotating button {
    cursor: var(--rotation-cursor);
  }
  .transform-edge {
    height: 20px;
    border-radius: 10px;
    cursor: grab;
  }
  .transform-edge:hover,
  .transform-edge:focus-visible {
    background: color-mix(in srgb, var(--accent) 24%, transparent);
  }
  .transform-edge:active {
    cursor: grabbing;
  }
  .transform-handle {
    width: 36px;
    height: 36px;
    transform: translate(-50%, -50%);
    cursor: move;
  }
  .transform-handle::after {
    content: '';
    display: block;
    width: 12px;
    height: 12px;
    margin: auto;
    border: 2px solid var(--accent);
    border-radius: 3px;
    background: white;
    box-shadow: 0 1px 4px #0002;
  }
  .axis-handle::after {
    border-radius: 50%;
    width: 10px;
    height: 10px;
  }
  .transform-handle:hover::after,
  .transform-handle:focus-visible::after {
    background: var(--accent);
  }
  .transform-readout {
    padding: 5px 10px;
    background: #fffffff0;
    border-radius: 20px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  @media (pointer: coarse) {
    .transform-handle {
      width: 44px;
      height: 44px;
    }
    .transform-edge {
      height: 28px;
    }
  }
</style>
