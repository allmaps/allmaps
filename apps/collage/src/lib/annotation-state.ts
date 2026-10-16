import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import type { CollageMap } from './model.ts'
import { invertMatrix, transformMatrix } from './affine-transform.ts'
import type { TransformValues } from './affine-transform.ts'

export function defaultAppearance(): CollageMap['appearance'] {
  return {
    applyMask: true,
    opacity: 1,
    saturation: 1,
    colorize: false,
    hue: 0,
    removeBackground: false
  }
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
function httpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
type SavedSettings = {
  appearance: CollageMap['appearance']
  groupId?: string
  locked?: boolean
  title?: string
  sourceUrl?: string
  originalResourceMask?: Point[]
  selectionTransform?: CollageMap['selectionTransform']
  transform?: Pick<
    NonNullable<CollageMap['affine']>,
    'values' | 'imported' | 'polynomial'
  >
}
/** Treat optional application metadata as untrusted; old annotations keep defaults. */
export function readCollageSettings(map: GeoreferencedMap): SavedSettings {
  const appearance = defaultAppearance()
  const saved = record(record(map._allmaps).collage)
  if (saved.version !== 1) return { appearance }
  const options = record(saved.appearance)
  for (const key of ['applyMask', 'colorize', 'removeBackground'] as const)
    if (typeof options[key] === 'boolean') appearance[key] = options[key]
  for (const key of ['opacity', 'saturation', 'hue'] as const) {
    const value = options[key]
    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1
    )
      appearance[key] = value
  }
  if (
    typeof options.backgroundColor === 'string' &&
    /^#[\da-f]{6}$/i.test(options.backgroundColor)
  )
    appearance.backgroundColor = options.backgroundColor
  const settings: SavedSettings = { appearance }
  if (
    typeof saved.groupId === 'string' &&
    saved.groupId.length > 0 &&
    saved.groupId.length <= 256
  )
    settings.groupId = saved.groupId
  if (typeof saved.locked === 'boolean') settings.locked = saved.locked
  if (typeof saved.title === 'string') settings.title = saved.title
  if (httpUrl(saved.sourceUrl)) settings.sourceUrl = saved.sourceUrl
  const mask = saved.originalResourceMask
  if (
    Array.isArray(mask) &&
    mask.length >= 3 &&
    mask.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        point.every(
          (value) =>
            typeof value === 'number' && Number.isFinite(value) && value >= 0
        )
    )
  )
    settings.originalResourceMask = structuredClone(mask) as Point[]
  const transform = record(saved.transform)
  const values = readTransformValues(transform.values)
  const imported = readTransformValues(transform.imported)
  if (values && imported && typeof transform.polynomial === 'boolean')
    settings.transform = { values, imported, polynomial: transform.polynomial }
  const selection = record(saved.selectionTransform)
  const selectionValues = readTransformValues(selection.values)
  if (
    selectionValues &&
    transformMatrix(selectionValues).flat().every(Number.isFinite) &&
    typeof selection.id === 'string' &&
    selection.id.length > 0 &&
    selection.id.length <= 256 &&
    typeof selection.rotation === 'number' &&
    Number.isFinite(selection.rotation) &&
    typeof selection.mapRotation === 'number' &&
    Number.isFinite(selection.mapRotation)
  )
    try {
      invertMatrix(transformMatrix(selectionValues))
      settings.selectionTransform = {
        id: selection.id,
        values: selectionValues,
        rotation: selection.rotation,
        mapRotation: selection.mapRotation
      }
    } catch {
      // Optional selector state must not prevent loading valid map geometry.
    }
  return settings
}

function readTransformValues(value: unknown): TransformValues | undefined {
  const candidate = record(value)
  if (
    !['scaleX', 'scaleY', 'skewX', 'skewY'].every(
      (key) =>
        typeof candidate[key] === 'number' && Number.isFinite(candidate[key])
    )
  )
    return
  const values = {
    scaleX: candidate.scaleX,
    scaleY: candidate.scaleY,
    skewX: candidate.skewX,
    skewY: candidate.skewY
  } as TransformValues
  try {
    transformMatrix(values)
    return values
  } catch {
    return
  }
}

/** Only non-default settings need metadata; geometry remains standard GCPs/masks. */
export function exportCollageSettings(item: CollageMap, defaultTitle: string) {
  const appearance: Partial<CollageMap['appearance']> = {}
  const defaults = defaultAppearance()
  for (const key of Object.keys(item.appearance) as (keyof typeof appearance)[])
    if (
      item.appearance[key] !== undefined &&
      item.appearance[key] !== defaults[key]
    )
      Object.assign(appearance, { [key]: item.appearance[key] })
  const originalMask = item.originalResourceMask ?? item.baseline.resourceMask
  const saved = {
    ...(Object.keys(appearance).length ? { appearance } : {}),
    ...(item.groupId ? { groupId: item.groupId } : {}),
    ...(item.locked ? { locked: true } : {}),
    ...(item.title !== defaultTitle ? { title: item.title } : {}),
    ...(httpUrl(item.sourceUrl) ? { sourceUrl: item.sourceUrl } : {}),
    ...(item.selectionTransform
      ? { selectionTransform: structuredClone(item.selectionTransform) }
      : {}),
    ...(JSON.stringify(originalMask) !== JSON.stringify(item.resourceMask)
      ? { originalResourceMask: structuredClone(originalMask) }
      : {}),
    ...(item.affine
      ? {
          transform: {
            values: { ...item.affine.values },
            imported: { ...item.affine.imported },
            polynomial: item.affine.polynomial
          }
        }
      : {})
  }
  return Object.keys(saved).length ? { version: 1, ...saved } : undefined
}
