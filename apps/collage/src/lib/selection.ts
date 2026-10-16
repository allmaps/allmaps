import type { CollageMap } from './model.ts'

export function selectionScope(items: CollageMap[], editingGroup?: string) {
  return editingGroup
    ? items.filter((item) => item.groupId === editingGroup)
    : items
}

/** Groups act as one object, except while editing their individual members. */
export function selectionObjects(items: CollageMap[], editingGroup?: string) {
  const objects = new Map<string, CollageMap[]>()
  for (const item of selectionScope(items, editingGroup)) {
    const key =
      item.groupId && !editingGroup
        ? `group:${item.groupId}`
        : `map:${item.instanceId}`
    const members = objects.get(key) ?? []
    members.push(item)
    objects.set(key, members)
  }
  return [...objects.values()]
}

/** Outside group editing, expand groups while retaining the clicked anchor. */
export function selectionIds(
  items: CollageMap[],
  ids: Iterable<string>,
  editingGroup?: string
) {
  const scope = selectionScope(items, editingGroup)
  const byId = new Map(scope.map((item) => [item.instanceId, item]))
  const selected = new Set<string>()
  for (const id of ids) {
    const item = byId.get(id)
    if (!item) continue
    selected.add(id)
    if (item.groupId && !editingGroup)
      for (const member of items)
        if (member.groupId === item.groupId) selected.add(member.instanceId)
  }
  return selected
}

export function toggleSelection(
  items: CollageMap[],
  selected: Set<string>,
  id: string,
  editingGroup?: string
) {
  const next = selectionIds(items, selected, editingGroup)
  const members = selectionIds(items, [id], editingGroup)
  for (const member of members) {
    if (selected.has(id)) next.delete(member)
    else next.add(member)
  }
  return next
}

export function selectionLocked(items: CollageMap[]) {
  return items.some((item) => item.locked)
}

export function singleGroup(items: CollageMap[]) {
  const id = items[0]?.groupId
  return !!id && items.every((item) => item.groupId === id)
}

export function groupMaps(items: CollageMap[]) {
  if (items.length < 2 || singleGroup(items) || selectionLocked(items))
    return false
  const groupId = crypto.randomUUID()
  for (const item of items) item.groupId = groupId
  return true
}

export function ungroupMaps(items: CollageMap[]) {
  if (selectionLocked(items) || !items.some((item) => item.groupId))
    return false
  for (const item of items) delete item.groupId
  return true
}

/** Replace only explicitly edited settings; all other per-map values survive. */
export function setAppearance(
  items: CollageMap[],
  patch: Partial<CollageMap['appearance']>
) {
  if (selectionLocked(items)) return
  for (const item of items) item.appearance = { ...item.appearance, ...patch }
}
