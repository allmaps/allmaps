import type { CollageMap } from './model.ts'

/** Random imports keep successful maps; explicit imports remain atomic.
 * Cleanup also covers a map added before its appearance options failed. */
export function renderImport(
  items: CollageMap[],
  render: (item: CollageMap) => void,
  remove: (item: CollageMap) => void,
  skipInvalid = false
): CollageMap[] {
  const added: CollageMap[] = []
  let failure: unknown
  for (const item of items) {
    try {
      render(item)
      added.push(item)
    } catch (error) {
      remove(item)
      failure = error
      if (!skipInvalid) {
        added.forEach(remove)
        throw error
      }
    }
  }
  if (items.length && !added.length) throw failure
  return added
}
