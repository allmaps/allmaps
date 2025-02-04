import type { Line, LineString, Point, Ring } from './geometry'

export type SvgAttributes = Record<string, string | number>

export type SvgCircle = {
  type: 'circle'
  attributes?: SvgAttributes
  coordinates: Point
}

export type SvgLine = {
  type: 'line'
  attributes?: SvgAttributes
  coordinates: Line
}

export type SvgPolyLine = {
  type: 'polyline'
  attributes?: SvgAttributes
  coordinates: LineString
}

export type SvgPolygon = {
  type: 'polygon'
  attributes?: SvgAttributes
  coordinates: Ring
}

export type SvgRect = {
  type: 'rect'
  attributes?: SvgAttributes
  coordinates: Ring
}

export type SvgGeometry =
  | SvgCircle
  | SvgLine
  | SvgPolyLine
  | SvgPolygon
  | SvgRect
