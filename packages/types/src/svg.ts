import type { Position } from './geometry'

export type SvgAttributes = Record<string, string | number>

export type SvgCircle = {
  type: 'circle'
  attributes?: SvgAttributes
  coordinates: Position
}

export type SvgLine = {
  type: 'line'
  attributes?: SvgAttributes
  coordinates: [Position, Position]
}

export type SvgPolyLine = {
  type: 'polyline'
  attributes?: SvgAttributes
  coordinates: Position[]
}

export type SvgPolygon = {
  type: 'polygon'
  attributes?: SvgAttributes
  coordinates: Position[]
}

export type SvgRect = {
  type: 'rect'
  attributes?: SvgAttributes
  coordinates: Position[]
}

export type SvgGeometry =
  | SvgCircle
  | SvgLine
  | SvgPolyLine
  | SvgPolygon
  | SvgRect
