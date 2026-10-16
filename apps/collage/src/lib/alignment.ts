import type { Point } from '@allmaps/types'
import { bounds } from './geometry.ts'
import type { Bounds } from './geometry.ts'
import { outline, placedMap } from './model.ts'
import type { CollageMap } from './model.ts'
import { selectionLocked, selectionObjects } from './selection.ts'

export type Alignment =
  'top' | 'bottom' | 'left' | 'right' | 'horizontal' | 'vertical'
export type Distribution =
  'horizontal' | 'vertical' | 'space-horizontal' | 'space-vertical'

type ObjectBox = { members: CollageMap[]; box: Bounds }

function selectionBoxes(items: CollageMap[], editingGroup?: string) {
  const objects = selectionObjects(items, editingGroup)
  if (objects.some(selectionLocked)) return []
  const boxes = objects.map((members) => ({
    members,
    box: bounds(members.flatMap(outline))
  }))
  if (boxes.some(({ box }) => box.some((value) => !Number.isFinite(value))))
    throw new Error('These maps do not have valid outlines to arrange.')
  return boxes
}

function selectionBounds(boxes: ObjectBox[]): Bounds {
  return [
    Math.min(...boxes.map(({ box }) => box[0])),
    Math.min(...boxes.map(({ box }) => box[1])),
    Math.max(...boxes.map(({ box }) => box[2])),
    Math.max(...boxes.map(({ box }) => box[3]))
  ]
}

function translateBoxes(boxes: ObjectBox[], axis: number, distances: number[]) {
  const selection = selectionBounds(boxes)
  const tolerance =
    Math.max(1, selection[2] - selection[0], selection[3] - selection[1]) *
    1e-12
  const updates = boxes.flatMap(({ members }, index) => {
    const distance = distances[index]
    if (Math.abs(distance) <= tolerance) return []
    return members.map((item) => {
      const position: Point = [...item.placement.position]
      position[axis] += distance
      const placement = { ...item.placement, position }
      // Validate the whole batch before changing any map.
      placedMap({ ...item, placement })
      return { item, placement }
    })
  })
  for (const { item, placement } of updates) item.placement = placement
  return updates.length > 0
}

/** Translate visible bounds to a common edge/center; groups stay rigid unless
 * their members are being edited individually inside group editing mode. */
export function alignMaps(
  items: CollageMap[],
  alignment: Alignment,
  editingGroup?: string
) {
  const boxes = selectionBoxes(items, editingGroup)
  if (boxes.length < 2) return false
  const selection = selectionBounds(boxes)
  const horizontal = ['left', 'right', 'horizontal'].includes(alignment)
  const axis = horizontal ? 0 : 1
  const coordinate = (box: Bounds) => {
    // World Y increases upwards, so top is the maximum Y.
    if (alignment === 'left' || alignment === 'bottom') return box[axis]
    if (alignment === 'right' || alignment === 'top') return box[axis + 2]
    return (box[axis] + box[axis + 2]) / 2
  }
  const target = coordinate(selection)
  return translateBoxes(
    boxes,
    axis,
    boxes.map(({ box }) => target - coordinate(box))
  )
}

/** Equalize existing gaps, or choose positive spacing around the current center. */
export function distributeMaps(
  items: CollageMap[],
  direction: Distribution,
  editingGroup?: string
) {
  const boxes = selectionBoxes(items, editingGroup)
  const automatic = direction.startsWith('space-')
  if (boxes.length < (automatic ? 2 : 3)) return false
  const axis = direction.endsWith('horizontal') ? 0 : 1
  boxes.sort(
    (a, b) => a.box[axis] + a.box[axis + 2] - (b.box[axis] + b.box[axis + 2])
  )
  const size = (box: Bounds) => box[axis + 2] - box[axis]
  const first = boxes[0].box[axis]
  const last = boxes[boxes.length - 1].box[axis + 2]
  const totalSize = boxes.reduce((sum, { box }) => sum + size(box), 0)
  // A crowded selection can retain overlap: distribution doesn't resize maps
  // or move the outer objects to make more room.
  const gap = automatic
    ? (totalSize / boxes.length) * 0.1
    : (last - first - totalSize) / (boxes.length - 1)
  let cursor = first
  if (automatic) {
    const selection = selectionBounds(boxes)
    cursor =
      (selection[axis] +
        selection[axis + 2] -
        (totalSize + gap * (boxes.length - 1))) /
      2
  }
  const distances = boxes.map(({ box }, index) => {
    const distance =
      !automatic && (index === 0 || index === boxes.length - 1)
        ? 0
        : cursor - box[axis]
    cursor += size(box) + gap
    return distance
  })
  return translateBoxes(boxes, axis, distances)
}
