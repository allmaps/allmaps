import type { Position, Point, Polygon } from 'geojson'

export { Position, Point, Polygon }

export type ImageWorldGCP = { image: Position; world: Position }

export type Segment = {
  from: ImageWorldGCP
  to: ImageWorldGCP
}
