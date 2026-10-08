export type LoadFailures = Record<string, string[]>

// Keep failures per resource, so one successful tile cannot hide another
// tile's failure. A retry clears only the resource that recovered.
export function updateLoadFailures(
  current: LoadFailures,
  mapIds: string[],
  resource: string,
  failed: boolean
): LoadFailures {
  const next = { ...current }
  for (const id of mapIds) {
    const resources = (current[id] ?? []).filter((key) => key !== resource)
    if (failed) resources.push(resource)
    if (resources.length) next[id] = resources
    else delete next[id]
  }
  return next
}
