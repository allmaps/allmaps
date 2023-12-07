import type { Point } from './geometry'

export type SvgAttributes = Record<string, string | number>

export type SvgCircle = {
  type: 'circle'
  attributes?: SvgAttributes
  coordinates: Point
}

export type SvgLine = {
  type: 'line'
  attributes?: SvgAttributes
  coordinates: [Point, Point]
}

export type SvgPolyLine = {
  type: 'polyline'
  attributes?: SvgAttributes
  coordinates: Point[]
}

export type SvgPolygon = {
  type: 'polygon'
  attributes?: SvgAttributes
  coordinates: Point[]
}

export type SvgRect = {
  type: 'rect'
  attributes?: SvgAttributes
  coordinates: Point[]
}

export type SvgGeometry =
  | SvgCircle
  | SvgLine
  | SvgPolyLine
  | SvgPolygon
  | SvgRect
