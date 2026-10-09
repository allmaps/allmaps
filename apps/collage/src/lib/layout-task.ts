import { arrangeMaps, arrangeGeographically, prepareMaps } from './model.ts'
import type { Arrangement, CollageMap } from './model.ts'
import type { Point } from '@allmaps/types'

export type LayoutRequest =
  | { type: 'add'; input: unknown; at: Point; sourceUrl?: string }
  | {
      type: 'arrange'
      items: CollageMap[]
      arrangement: Arrangement
      anchorId: string
    }

export type LayoutResult = { items: CollageMap[]; fallback: boolean }
export type LayoutReply = { result: LayoutResult } | { error: string }

/** Runs on isolated worker data. Nothing in the current document changes until
 * the complete result has been validated and returned. */
export function solveLayout(request: LayoutRequest): LayoutResult {
  const items =
    request.type === 'add'
      ? prepareMaps(request.input, request.at, request.sourceUrl)
      : structuredClone(request.items)
  const anchor =
    request.type === 'add'
      ? items[0]
      : items.find((item) => item.instanceId === request.anchorId)
  if (items.length && !anchor)
    throw new Error('The fixed map is no longer selected.')
  if (request.type === 'arrange' && request.arrangement === 'geographic') {
    arrangeGeographically(items, anchor)
    return { items, fallback: false }
  }
  return { items, fallback: arrangeMaps(items, anchor) }
}
