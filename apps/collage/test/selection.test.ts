import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import { openCollage, duplicateMaps, exportCollage } from '../src/lib/model.ts'
import {
  groupMaps,
  ungroupMaps,
  selectionIds,
  selectionScope,
  toggleSelection,
  selectionLocked,
  canEditLayout,
  singleGroup,
  setAppearance
} from '../src/lib/selection.ts'

function fixture() {
  const source: GeoreferencedMap = {
    type: 'GeoreferencedMap',
    resource: {
      id: 'https://example.org/image',
      type: 'ImageService2',
      width: 1000,
      height: 1000
    },
    resourceMask: [
      [0, 0],
      [1000, 0],
      [1000, 1000],
      [0, 1000]
    ],
    gcps: [
      { resource: [0, 0], geo: [0, 0] },
      { resource: [1000, 0], geo: [0.01, 0] },
      { resource: [0, 1000], geo: [0, -0.01] }
    ],
    transformation: { type: 'helmert' }
  }
  const items = openCollage(generateAnnotation([source, source, source]))
  items[0].appearance.opacity = 0.3
  items[1].appearance.hue = 0.4
  items[1].appearance.colorize = true
  items[2].appearance.saturation = 0
  return items
}

test('group and ungroup preserve individual settings, geometry and order', () => {
  const items = fixture()
  const before = structuredClone(items)
  assert.equal(groupMaps(items), true)
  assert.equal(singleGroup(items), true)
  assert.equal(groupMaps(items), false)
  items.forEach((item, i) => {
    const { groupId, ...rest } = item
    assert.ok(groupId)
    assert.deepEqual(rest, before[i])
  })
  assert.equal(ungroupMaps(items), true)
  assert.deepEqual(items, before)
})

test('clicks, additive selection and marquee hits select whole groups', () => {
  const items = fixture()
  groupMaps(items.slice(0, 2))
  const [a, b, c] = items.map((item) => item.instanceId)
  assert.deepEqual([...selectionIds(items, [b])], [b, a])
  assert.deepEqual([...selectionIds(items, [c, a, 'missing'])], [c, a, b])
  const selection = selectionIds(items, [b, c])
  assert.deepEqual([...toggleSelection(items, selection, a)], [c])
  assert.deepEqual([...toggleSelection(items, new Set([c]), b)], [c, b, a])
})

test('changing one group setting retains all other per-map settings', () => {
  const items = fixture()
  groupMaps(items)
  const before = structuredClone(items)
  setAppearance(items, { opacity: 0.75 })
  items.forEach((item, i) => {
    assert.deepEqual(item.appearance, {
      ...before[i].appearance,
      opacity: 0.75
    })
    assert.deepEqual(item.resourceMask, before[i].resourceMask)
    assert.deepEqual(item.placement, before[i].placement)
  })
  setAppearance(items, { hue: 0.2, colorize: true })
  assert.ok(
    items.every(
      (item) => item.appearance.hue === 0.2 && item.appearance.colorize
    )
  )
  assert.equal(items[2].appearance.saturation, 0)
})

test('a locked member blocks edits and regrouping of the selection', () => {
  const items = fixture()
  groupMaps(items.slice(0, 2))
  items[1].locked = true
  const before = structuredClone(items)
  assert.equal(selectionLocked(items), true)
  assert.equal(groupMaps(items), false)
  assert.equal(ungroupMaps(items), false)
  setAppearance(items, { opacity: 0 })
  assert.deepEqual(items, before)
  items[1].locked = false
  assert.equal(selectionLocked(items), false)
  assert.equal(ungroupMaps(items), true)
})

test('layout tools exclude selections containing groups except inside that group editor', () => {
  const items = fixture()
  assert.equal(canEditLayout(items), true)
  assert.equal(canEditLayout([]), false)
  assert.equal(canEditLayout(items.slice(0, 1)), false)
  groupMaps(items.slice(0, 2))
  const group = items[0].groupId!
  assert.equal(canEditLayout(items), false)
  assert.equal(canEditLayout(items.slice(0, 2)), false)
  assert.equal(canEditLayout(items.slice(0, 2), group), true)
  assert.equal(canEditLayout(items.slice(0, 2), 'another-group'), false)
  items[0].locked = true
  assert.equal(canEditLayout(items.slice(0, 2), group), false)
  items[0].locked = false
  ungroupMaps(items)
  assert.equal(canEditLayout(items), true)
})

test('duplicated groups stay together without joining the original group', () => {
  const items = fixture()
  groupMaps(items.slice(0, 2))
  const copies = duplicateMaps(items, [20, 30])
  assert.ok(singleGroup(copies.slice(0, 2)))
  assert.notEqual(copies[0].groupId, items[0].groupId)
  assert.equal(copies[2].groupId, undefined)
  copies.forEach((item, i) =>
    assert.deepEqual(item.appearance, items[i].appearance)
  )
  assert.deepEqual(
    [...selectionIds([...items, ...copies], [copies[0].instanceId])],
    copies.slice(0, 2).map((item) => item.instanceId)
  )
})

test('undo snapshots and annotations retain groups and locks', () => {
  const items = fixture()
  const ungrouped = structuredClone(items)
  const annotation = exportCollage(items)
  groupMaps(items)
  items.forEach((item) => {
    item.locked = true
  })
  const snapshot = structuredClone(items)
  ungroupMaps(ungrouped)
  assert.equal(singleGroup(ungrouped), false)
  assert.equal(singleGroup(snapshot), true)
  assert.equal(selectionLocked(snapshot), true)
  assert.notDeepEqual(exportCollage(items), annotation)
  const reopened = openCollage(exportCollage(items))
  assert.equal(singleGroup(reopened), true)
  assert.equal(selectionLocked(reopened), true)
})

test('group editing isolates selection and allows editing one member without ungrouping', () => {
  const items = fixture()
  groupMaps(items.slice(0, 2))
  const group = items[0].groupId!
  const [a, b, outside] = items.map((item) => item.instanceId)
  assert.deepEqual(selectionScope(items, group), items.slice(0, 2))
  assert.deepEqual([...selectionIds(items, [a, outside], group)], [a])
  const all = selectionIds(items, [a, b, outside], group)
  assert.deepEqual([...all], [a, b])
  assert.deepEqual([...toggleSelection(items, all, a, group)], [b])
  assert.deepEqual([...toggleSelection(items, all, outside, group)], [a, b])
  const before = structuredClone(items)
  const ids = selectionIds(items, [a], group)
  setAppearance(
    items.filter((item) => ids.has(item.instanceId)),
    { opacity: 0.8 }
  )
  assert.equal(items[0].appearance.opacity, 0.8)
  assert.deepEqual(items.slice(1), before.slice(1))
  assert.ok(singleGroup(items.slice(0, 2)))
  // Leaving the scope restores ordinary whole-group selection.
  assert.deepEqual([...selectionIds(items, [a])], [a, b])
})

test('duplicates inside group editing stay in the group and select individually', () => {
  const items = fixture()
  groupMaps(items.slice(0, 2))
  const editingGroup = items[0].groupId!
  const [copy] = duplicateMaps([items[0]], [20, 30], { editingGroup })
  const next = [...items, copy]
  assert.equal(copy.groupId, editingGroup)
  assert.deepEqual(selectionScope(next, editingGroup), [
    items[0],
    items[1],
    copy
  ])
  assert.deepEqual(
    [...selectionIds(next, [copy.instanceId], editingGroup)],
    [copy.instanceId]
  )
  assert.deepEqual(
    new Set(selectionIds(next, [copy.instanceId])),
    new Set([copy.instanceId, items[0].instanceId, items[1].instanceId])
  )
  assert.deepEqual(copy.appearance, items[0].appearance)
})

test('scope follows membership through deletion and undo without selecting outside maps', () => {
  const items = fixture()
  groupMaps(items.slice(0, 2))
  const group = items[0].groupId!
  const before = structuredClone(items)
  const remaining = items.slice(1)
  assert.deepEqual(selectionScope(remaining, group), [items[1]])
  assert.deepEqual(
    [
      ...selectionIds(
        remaining,
        items.map((item) => item.instanceId),
        group
      )
    ],
    [items[1].instanceId]
  )
  assert.equal(selectionScope(before, group).length, 2)
  assert.deepEqual(selectionScope([items[2]], group), [])
})
