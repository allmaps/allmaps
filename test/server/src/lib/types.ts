export type CorsMode = 'cors' | 'no-cors'
export type IiifVersion = '2' | '3'

export type Region = {
  left: number
  top: number
  width: number
  height: number
}

export type Size = {
  width?: number
  height?: number
  fit?: 'inside' | 'fill'
}

// IIIF source documents are arbitrary JSON objects.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonObject = Record<string, any>
export type Point = [number, number]
export type Ring = Point[]
export type Bbox = [number, number, number, number]
