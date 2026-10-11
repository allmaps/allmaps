import { lonLatToWebMercator, webMercatorToLonLat } from '@allmaps/project'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import { imageTransform } from './map-search.ts'

export type CircleSelection = { center: Point; radius: number }
export type CircleFrame = {
  width: number
  height: number
  x: number
  y: number
  radius: number
}
const WORLD = 2 * Math.PI * 6378137
const latitudeScale = (latitude: number) => Math.cos((latitude * Math.PI) / 180)

/** A stable aperture: loading notices never change its screen position or size. */
export function circleFrame(width: number, height: number): CircleFrame {
  const top = Math.min(64, height / 4)
  const bottom = Math.min(
    width <= 520 ? 192 : width <= 960 ? 128 : 80,
    height * 0.45
  )
  return {
    width,
    height,
    x: width / 2,
    y: (top + height - bottom) / 2,
    radius: Math.max(
      24,
      Math.min((width - 24) / 2, (height - top - bottom) / 2)
    )
  }
}

export function circleFromCamera(
  center: Point,
  zoom: number,
  frame: CircleFrame
): CircleSelection {
  const units = WORLD / (512 * 2 ** zoom)
  const projected = lonLatToWebMercator(center)
  const geo = webMercatorToLonLat([
    projected[0] + (frame.x - frame.width / 2) * units,
    projected[1] - (frame.y - frame.height / 2) * units
  ]) as Point
  return { center: geo, radius: frame.radius * units * latitudeScale(geo[1]) }
}

export function cameraForCircle(
  circle: CircleSelection,
  frame: CircleFrame
): { center: Point; zoom: number } {
  const units = circle.radius / (frame.radius * latitudeScale(circle.center[1]))
  const projected = lonLatToWebMercator(circle.center)
  return {
    center: webMercatorToLonLat([
      projected[0] - (frame.x - frame.width / 2) * units,
      projected[1] + (frame.y - frame.height / 2) * units
    ]),
    zoom: Math.log2(WORLD / (512 * units))
  }
}

/** Clamp in image coordinates, where a Helmert-transformed circle is still a
 * circle and the image bounds are an axis-aligned rectangle. This constrains
 * the camera before rendering, including during wheel, touch and inertia. */
export function constrainCircle(
  source: GeoreferencedMap,
  circle: CircleSelection
): CircleSelection {
  const transform = imageTransform(source)
  const width = source.resource.width!,
    height = source.resource.height!
  const [x, y] = transform.toResource(circle.center)
  const scale = latitudeScale(circle.center[1])
  const maximum = Math.min(width, height) / 2 - 1e-6
  let radius = Math.min(circle.radius / (scale * transform.scale), maximum)
  const centerForRadius = () =>
    transform.toGeo([
      Math.max(radius + 1e-7, Math.min(width - radius - 1e-7, x)),
      Math.max(radius + 1e-7, Math.min(height - radius - 1e-7, y))
    ])
  // Moving to an image edge can change latitude. Enforce the ground-radius
  // limits at the constrained center, with a small margin for round-off.
  for (let i = 0; i < 8; i++) {
    const groundScale = transform.scale * latitudeScale(centerForRadius()[1])
    const next = Math.min(
      maximum,
      Math.max(
        (10 + 1e-6) / groundScale,
        Math.min((50000 - 1e-6) / groundScale, radius)
      )
    )
    if (Math.abs(next - radius) < 1e-10) break
    radius = next
  }
  const center = centerForRadius()
  return { center, radius: radius * transform.scale * latitudeScale(center[1]) }
}

/** Keep the fitted surface at its original geography, using only three GCPs. */
export function previewMap(source: GeoreferencedMap): GeoreferencedMap {
  const transform = imageTransform(source)
  const points: Point[] = [
    [0, 0],
    [source.resource.width!, 0],
    [0, source.resource.height!]
  ]
  return {
    ...source,
    transformation: { type: 'helmert' },
    gcps: points.map((resource) => ({
      resource,
      geo: transform.toGeo(resource)
    }))
  }
}

/** Ignore camera round-off and subpixel movement when enabling Refine. */
export function circleChanged(
  view: CircleSelection,
  query: CircleSelection,
  frame: CircleFrame
): boolean {
  const a = lonLatToWebMercator(view.center),
    b = lonLatToWebMercator(query.center)
  const units = query.radius / (frame.radius * latitudeScale(query.center[1]))
  return (
    Math.hypot(a[0] - b[0], a[1] - b[1]) > units / 2 ||
    Math.abs(view.radius - query.radius) > query.radius / frame.radius / 2
  )
}
