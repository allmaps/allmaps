import type { Point } from '@allmaps/types'
import { bounds } from './geometry.ts'
import type { Bounds } from './geometry.ts'
import { outline, placedMap } from './model.ts'
import type { CollageMap } from './model.ts'
import { selectionLocked, selectionScope } from './selection.ts'

export type Alignment =
  'top' | 'bottom' | 'left' | 'right' | 'horizontal' | 'vertical'

/** Translate visible bounds to a common edge/center; groups stay rigid unless
 * their members are being edited individually inside group editing mode. */
export function alignMaps(
  items: CollageMap[],
  alignment: Alignment,
  editingGroup?: string
) {
  const scope = selectionScope(items, editingGroup)
  if (selectionLocked(scope)) return false
  const objects = new Map<string, CollageMap[]>()
  for (const item of scope) {
    const key =
      item.groupId && !editingGroup
        ? `group:${item.groupId}`
        : `map:${item.instanceId}`
    const members = objects.get(key) ?? []
    members.push(item)
    objects.set(key, members)
  }
  if (objects.size < 2) return false

  const boxes = [...objects.values()].map((members) => ({
    members,
    box: bounds(members.flatMap(outline))
  }))
  if (boxes.some(({ box }) => box.some((value) => !Number.isFinite(value))))
    throw new Error('These maps do not have valid outlines to align.')
  const selection: Bounds = [
    Math.min(...boxes.map(({ box }) => box[0])),
    Math.min(...boxes.map(({ box }) => box[1])),
    Math.max(...boxes.map(({ box }) => box[2])),
    Math.max(...boxes.map(({ box }) => box[3]))
  ]
  const horizontal = ['left', 'right', 'horizontal'].includes(alignment)
  const axis = horizontal ? 0 : 1
  const coordinate = (box: Bounds) => {
    // World Y increases upwards, so top is the maximum Y.
    if (alignment === 'left' || alignment === 'bottom') return box[axis]
    if (alignment === 'right' || alignment === 'top') return box[axis + 2]
    return (box[axis] + box[axis + 2]) / 2
  }
  const target = coordinate(selection)
  const tolerance =
    Math.max(1, selection[2] - selection[0], selection[3] - selection[1]) *
    1e-12
  const updates = boxes.flatMap(({ members, box }) => {
    const distance = target - coordinate(box)
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
