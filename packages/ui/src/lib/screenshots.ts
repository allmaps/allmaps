/** Browser interactions run in order before final capture readiness checks. */
export type ScreenshotStep =
  | { action: 'click' | 'hover'; selector: string }
  | { action: 'fill' | 'select'; selector: string; value: string }
  | { action: 'press'; selector: string; key: string }
  | {
      action: 'waitFor'
      selector: string
      state?: 'visible' | 'hidden'
    }

export type ScreenshotBounds = {
  x: number
  y: number
  width: number
  height: number
}

/** Crop coordinates and padding are in viewport CSS pixels. */
export type ScreenshotCrop =
  ScreenshotBounds | { selector: string; padding?: number }

/** Public metadata; target coordinates are relative to the output image in CSS pixels. */
export type ScreenshotGeometry = {
  schemaVersion: 1
  slug: string
  version: number
  imageSha256: string
  viewport: { width: number; height: number }
  targets: Record<string, ScreenshotBounds>
  crop?: ScreenshotBounds
}

/** Capture settings shared by the component, build collector and local browser. */
export type ScreenshotOptions = {
  url: string
  slug: string
  version?: number
  viewport?: {
    width?: number
    height?: number
    deviceScaleFactor?: number
  }
  crop?: ScreenshotCrop
  steps?: ScreenshotStep[]
  targets?: Record<string, string>
  waitForSelector?: string
  waitForRender?: boolean
  delay?: number
}

export type ScreenshotDefinition = Omit<
  ScreenshotOptions,
  'version' | 'viewport' | 'delay'
> & {
  version: number
  viewport: Required<NonNullable<ScreenshotOptions['viewport']>>
  delay: number
}

export type ScreenshotManifest = {
  version: 1
  screenshots: ScreenshotDefinition[]
}

export const screenshotFilesBaseUrl = 'https://files.allmaps.org'

function positiveInteger(value: number, name: string, maximum: number) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(
      `Screenshot ${name} must be an integer from 1 to ${maximum}`
    )
  }
  return value
}

export function defineScreenshot(
  options: ScreenshotOptions
): ScreenshotDefinition {
  if (!options || typeof options.url !== 'string') {
    throw new Error('Screenshot URL is required')
  }
  const url = new URL(options.url)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error('Screenshot URL must be HTTP(S) without credentials')
  }
  if (
    typeof options.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)
  ) {
    throw new Error(
      'Screenshot slug must contain lowercase words separated by hyphens'
    )
  }
  const steps = options.steps === undefined ? [] : normalizeSteps(options.steps)
  const targets =
    options.targets === undefined ? {} : normalizeTargets(options.targets)
  const viewport = {
    width: positiveInteger(options.viewport?.width ?? 1440, 'width', 4096),
    height: positiveInteger(options.viewport?.height ?? 900, 'height', 4096)
  }
  const crop =
    options.crop === undefined
      ? undefined
      : normalizeCrop(options.crop, viewport)
  const deviceScaleFactor = options.viewport?.deviceScaleFactor ?? 2
  if (
    !Number.isFinite(deviceScaleFactor) ||
    deviceScaleFactor < 1 ||
    deviceScaleFactor > 3
  ) {
    throw new Error('Screenshot deviceScaleFactor must be between 1 and 3')
  }
  const delay = options.delay ?? 1000
  if (!Number.isFinite(delay) || delay < 0 || delay > 60_000) {
    throw new Error('Screenshot delay must be between 0 and 60000 milliseconds')
  }
  if (
    options.waitForRender !== undefined &&
    typeof options.waitForRender !== 'boolean'
  ) {
    throw new Error('Screenshot waitForRender must be a boolean')
  }
  if (
    options.waitForSelector !== undefined &&
    (typeof options.waitForSelector !== 'string' ||
      !options.waitForSelector.trim())
  ) {
    throw new Error('Screenshot waitForSelector must be a nonempty selector')
  }
  return {
    url: url.href,
    slug: options.slug,
    version: positiveInteger(options.version ?? 1, 'version', 1_000_000),
    viewport: {
      ...viewport,
      deviceScaleFactor
    },
    ...(options.waitForSelector
      ? { waitForSelector: options.waitForSelector }
      : {}),
    ...(options.waitForRender ? { waitForRender: true } : {}),
    ...(crop ? { crop } : {}),
    ...(steps.length ? { steps } : {}),
    ...(Object.keys(targets).length ? { targets } : {}),
    delay
  }
}

export function screenshotKey(
  definition: Pick<ScreenshotDefinition, 'slug' | 'version'>
) {
  return `screenshots/${definition.slug}/v${definition.version}.webp`
}

export function screenshotUrl(
  definition: Pick<ScreenshotDefinition, 'slug' | 'version'>,
  baseUrl = screenshotFilesBaseUrl
) {
  return `${baseUrl.replace(/\/$/, '')}/${screenshotKey(definition)}`
}

function nonemptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Screenshot ${name} must be a nonempty string`)
  }
}

function boundsInside(
  bounds: ScreenshotBounds,
  size: { width: number; height: number }
) {
  return (
    bounds &&
    [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) &&
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.x + bounds.width <= size.width &&
    bounds.y + bounds.height <= size.height
  )
}

function normalizeCrop(
  crop: ScreenshotCrop,
  viewport: { width: number; height: number }
): ScreenshotCrop {
  if (!crop || typeof crop !== 'object' || Array.isArray(crop)) {
    throw new Error(
      'Screenshot crop must be a rectangle or an element selector'
    )
  }
  if ('selector' in crop) {
    nonemptyString(crop.selector, 'crop selector')
    if (['x', 'y', 'width', 'height'].some((key) => key in crop)) {
      throw new Error('Screenshot crop cannot combine a rectangle and selector')
    }
    const padding = crop.padding ?? 0
    if (!Number.isFinite(padding) || padding < 0) {
      throw new Error('Screenshot crop padding must be a nonnegative number')
    }
    return { selector: crop.selector, padding }
  }
  if ('padding' in crop || !boundsInside(crop, viewport)) {
    throw new Error(
      'Screenshot crop rectangle must be fully inside the viewport'
    )
  }
  // Round outward to whole CSS pixels, matching the element-crop measurement.
  const x = Math.floor(crop.x)
  const y = Math.floor(crop.y)
  return {
    x,
    y,
    width: Math.ceil(crop.x + crop.width) - x,
    height: Math.ceil(crop.y + crop.height) - y
  }
}

function normalizeTargets(targets: Record<string, string>) {
  if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
    throw new Error(
      'Screenshot targets must be a record of names and selectors'
    )
  }
  return Object.fromEntries(
    Object.entries(targets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, selector]) => {
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
          throw new Error(`Screenshot target name is invalid: ${name}`)
        }
        nonemptyString(selector, `target ${name} selector`)
        return [name, selector]
      })
  )
}

function normalizeSteps(steps: ScreenshotStep[]): ScreenshotStep[] {
  if (!Array.isArray(steps))
    throw new Error('Screenshot steps must be an array')
  return steps.map((step, index) => {
    if (!step || typeof step !== 'object')
      throw new Error(`Invalid screenshot step ${index + 1}`)
    nonemptyString(step.selector, `step ${index + 1} selector`)
    const { action, selector } = step
    switch (action) {
      case 'click':
      case 'hover':
        return { action, selector }
      case 'fill':
      case 'select':
        if (typeof step.value !== 'string')
          throw new Error(`Screenshot step ${index + 1} value must be a string`)
        return { action, selector, value: step.value }
      case 'press':
        nonemptyString(step.key, `step ${index + 1} key`)
        return { action, selector, key: step.key }
      case 'waitFor':
        if (
          step.state !== undefined &&
          !['visible', 'hidden'].includes(step.state)
        ) {
          throw new Error(`Invalid screenshot step ${index + 1} wait state`)
        }
        return { action, selector, state: step.state ?? 'visible' }
      default:
        throw new Error(`Invalid screenshot step ${index + 1} action`)
    }
  })
}

export function screenshotGeometryKey(
  definition: Pick<ScreenshotDefinition, 'slug' | 'version'>
) {
  return screenshotKey(definition).replace(/\.webp$/, '.geometry.json')
}

/** Validate metadata before using it in SVG or publishing it with an image. */
export function validateScreenshotGeometry(value: unknown): ScreenshotGeometry {
  const geometry = value as ScreenshotGeometry
  if (
    !geometry ||
    geometry.schemaVersion !== 1 ||
    typeof geometry.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(geometry.slug) ||
    !Number.isInteger(geometry.version) ||
    geometry.version < 1 ||
    typeof geometry.imageSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(geometry.imageSha256) ||
    !geometry.viewport ||
    !Number.isInteger(geometry.viewport.width) ||
    geometry.viewport.width <= 0 ||
    !Number.isInteger(geometry.viewport.height) ||
    geometry.viewport.height <= 0 ||
    !geometry.targets ||
    typeof geometry.targets !== 'object' ||
    Array.isArray(geometry.targets)
  ) {
    throw new Error('Invalid screenshot geometry')
  }
  if (
    geometry.crop !== undefined &&
    (!boundsInside(geometry.crop, geometry.viewport) ||
      ![
        geometry.crop.x,
        geometry.crop.y,
        geometry.crop.width,
        geometry.crop.height
      ].every(Number.isInteger))
  ) {
    throw new Error('Invalid screenshot crop geometry')
  }
  const size = geometry.crop ?? geometry.viewport
  for (const [name, bounds] of Object.entries(geometry.targets)) {
    if (!boundsInside(bounds, size)) {
      throw new Error(`Invalid screenshot bounds for ${name}`)
    }
  }
  return geometry
}

/** Keep rendering options out of capture definitions and cache signatures. */
export function screenshotHighlights(
  definition: ScreenshotDefinition,
  geometry: ScreenshotGeometry | undefined,
  highlights: string[]
): { name: string; bounds: ScreenshotBounds }[] {
  if (!highlights.length) return []
  if (!geometry)
    throw new Error('Screenshot highlights require captured geometry')
  screenshotImageSize(definition, geometry)
  return [...new Set(highlights)].map((name) => {
    if (!Object.hasOwn(geometry.targets, name))
      throw new Error(`Unknown screenshot highlight: ${name}`)
    return { name, bounds: geometry.targets[name] }
  })
}

/** Use captured crop dimensions; element crops without metadata use the image's intrinsic size. */
export function screenshotImageSize(
  definition: ScreenshotDefinition,
  geometry?: ScreenshotGeometry
): { width: number; height: number } | undefined {
  if (geometry) {
    validateScreenshotGeometry(geometry)
    if (
      geometry.slug !== definition.slug ||
      geometry.version !== definition.version ||
      geometry.viewport.width !== definition.viewport.width ||
      geometry.viewport.height !== definition.viewport.height ||
      Boolean(definition.crop) !== Boolean(geometry.crop) ||
      (definition.crop &&
        !('selector' in definition.crop) &&
        (definition.crop.x !== geometry.crop?.x ||
          definition.crop.y !== geometry.crop?.y ||
          definition.crop.width !== geometry.crop?.width ||
          definition.crop.height !== geometry.crop?.height))
    ) {
      throw new Error('Screenshot geometry does not match the image definition')
    }
    return geometry.crop ?? geometry.viewport
  }
  return definition.crop
    ? 'selector' in definition.crop
      ? undefined
      : definition.crop
    : definition.viewport
}
