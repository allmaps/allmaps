export type Color = [number, number, number]
export type OptionalColor = Color | undefined

export type ColorCount = {
  count: number
  color: Color
}

export type Histogram = {
  [bin: string]: ColorCount
}
