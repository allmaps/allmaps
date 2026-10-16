import { controlOrder } from './control-layout.ts'
import type { Control } from './control-layout.ts'

export type ToolSetting = { tool: Control; enabled: boolean }
export const toolSettingsKey = 'allmaps-collage-tools'
export const toolLabels: Record<Control, string> = {
  remove: 'Remove',
  front: 'Layer order',
  duplicate: 'Duplicate',
  openIn: 'Open in Viewer',
  background: 'Remove background',
  saturation: 'Saturation',
  lock: 'Lock',
  hue: 'Colorize',
  opacity: 'Opacity',
  editMask: 'Edit mask',
  mirror: 'Mirror',
  transform: 'Transform',
  move: 'Move',
  rotate: 'Rotate'
}
export function defaultToolSettings(): ToolSetting[] {
  return controlOrder.map((tool) => ({
    tool,
    enabled: tool !== 'mirror'
  }))
}
/** Keep saved ordering, ignore obsolete/duplicate tools, and append new ones. */
export function parseToolSettings(value: unknown): ToolSetting[] {
  const defaults = defaultToolSettings()
  if (!Array.isArray(value)) return defaults
  const result: ToolSetting[] = []
  for (const entry of value) {
    if (
      entry &&
      defaults.some(({ tool }) => tool === entry.tool) &&
      typeof entry.enabled === 'boolean' &&
      !result.some(({ tool }) => tool === entry.tool)
    )
      result.push({ tool: entry.tool, enabled: entry.enabled })
  }
  return [
    ...result,
    ...defaults.filter(
      ({ tool }) => !result.some((entry) => entry.tool === tool)
    )
  ]
}
export function enabledTools(
  settings: ToolSetting[],
  locked = false
): Control[] {
  const tools = settings
    .filter(({ enabled }) => enabled)
    .map(({ tool }) => tool)
  // A hidden lock tool must never make an already locked map impossible to unlock.
  if (locked && !tools.includes('lock')) tools.push('lock')
  return tools
}

export const importTransformationKey = 'allmaps-collage-import-transformation'
export function parseImportTransformation(value: unknown) {
  return value === 'polynomial' ? 'polynomial' : 'helmert'
}
export function reorderTool(
  settings: ToolSetting[],
  tool: Control,
  index: number
): ToolSetting[] {
  const entry = settings.find((entry) => entry.tool === tool)
  if (!entry) return settings
  const next = settings.filter((entry) => entry.tool !== tool)
  next.splice(Math.max(0, Math.min(next.length, index)), 0, entry)
  return next
}
