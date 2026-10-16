import { controlOrder } from './control-layout.ts'
import type { Control, RingControl } from './control-layout.ts'

export type ToolSetting =
  { tool: Control; enabled: boolean } | { tool: 'more'; enabled?: never }
const primaryTools: readonly Control[] = ['move', 'rotate', 'remove']
export const toolSettingsKey = 'allmaps-collage-tools'
export const toolLabels: Record<Control, string> = {
  remove: 'Remove',
  front: 'Layer order',
  duplicate: 'Duplicate',
  openIn: 'Open in Viewer',
  background: 'Remove background',
  saturation: 'Saturation',
  hue: 'Colorize',
  opacity: 'Opacity',
  editMask: 'Edit mask',
  mirror: 'Mirror',
  transform: 'Transform',
  move: 'Move',
  rotate: 'Rotate'
}
export function defaultToolSettings(): ToolSetting[] {
  return [
    ...primaryTools.map((tool) => ({ tool, enabled: true })),
    { tool: 'more' },
    ...controlOrder
      .filter((tool) => !primaryTools.includes(tool))
      .map((tool) => ({ tool, enabled: tool !== 'mirror' }))
  ]
}
/** Keep saved ordering, ignore obsolete/duplicate tools, and append new ones. */
export function parseToolSettings(value: unknown): ToolSetting[] {
  const defaults = defaultToolSettings()
  if (!Array.isArray(value)) return defaults
  const result: ToolSetting[] = []
  for (const entry of value) {
    if (entry?.tool === 'more' && !result.some(({ tool }) => tool === 'more')) {
      result.push({ tool: 'more' })
      continue
    }
    if (
      entry &&
      controlOrder.some((tool) => tool === entry.tool) &&
      typeof entry.enabled === 'boolean' &&
      !result.some(({ tool }) => tool === entry.tool)
    )
      result.push({ tool: entry.tool, enabled: entry.enabled })
  }
  const complete = [
    ...result,
    ...defaults.filter(
      ({ tool }) =>
        tool !== 'more' && !result.some((entry) => entry.tool === tool)
    )
  ]
  if (result.some(({ tool }) => tool === 'more')) return complete
  // Older preferences had a single list. Preserve each tool's enabled state
  // and relative order, and introduce the default compact/expanded split.
  return [
    ...complete.filter(({ tool }) => primaryTools.includes(tool as Control)),
    { tool: 'more' },
    ...complete.filter(({ tool }) => !primaryTools.includes(tool as Control))
  ]
}
export function enabledTools(settings: ToolSetting[]): Control[] {
  return settings.flatMap((entry) =>
    entry.tool !== 'more' && entry.enabled ? [entry.tool] : []
  )
}

/** The divider is also the toggle at the end of the visible ring. */
export function visibleTools(
  settings: ToolSetting[],
  expanded: boolean
): RingControl[] {
  const divider = settings.findIndex(({ tool }) => tool === 'more')
  if (divider < 0) return enabledTools(settings)
  const primary = enabledTools(settings.slice(0, divider))
  const secondary = enabledTools(settings.slice(divider + 1))
  return secondary.length
    ? [...primary, ...(expanded ? secondary : []), 'more']
    : primary
}

export type DoubleTapMode = 'mask' | 'transform'
export const doubleTapModeKey = 'allmaps-collage-double-tap'
export function parseDoubleTapMode(value: unknown): DoubleTapMode {
  return value === 'transform' ? 'transform' : 'mask'
}

export const importTransformationKey = 'allmaps-collage-import-transformation'
export function parseImportTransformation(value: unknown) {
  return value === 'polynomial' ? 'polynomial' : 'helmert'
}
export function reorderTool(
  settings: ToolSetting[],
  tool: RingControl,
  index: number
): ToolSetting[] {
  const entry = settings.find((entry) => entry.tool === tool)
  if (!entry) return settings
  const next = settings.filter((entry) => entry.tool !== tool)
  next.splice(Math.max(0, Math.min(next.length, index)), 0, entry)
  return next
}
