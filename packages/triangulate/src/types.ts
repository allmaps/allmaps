import type {
  Point,
  Polygon,
  Triangle,
  TypedLine,
  TypedPolygon,
  TypedTriangle
} from '@allmaps/types'

export type TriangulationToUnique = {
  interpolatedPolygon: Polygon
  interpolatedPolygonPoints: Point[]
  gridPoints: Point[]
  gridPointsInPolygon: Point[]
  interpolatedSteinerPolygons: Polygon[]
  interpolatedSteinerPolygonsPoints: Point[]
  uniquePoints: Point[]
  triangles: Triangle[]
  uniquePointIndexTriangles: TypedTriangle<number>[]
  uniquePointIndexInterpolatedPolygon: TypedPolygon<number>
  uniquePointIndexEdges: TypedLine<number>[]
  uniquePointIndexInterpolatedSteinerPolygons: TypedPolygon<number>[]
  insideSteinerPolygonsTriangles: boolean[]
}

export type TriangluationOptions = {
  steinerPoints: Point[]
  steinerPolygons: Polygon[]
  minimumTriangleAngle: number
  computeInsideSteinerPolygons: boolean
}
