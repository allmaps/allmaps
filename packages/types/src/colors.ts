export type Color = [number, number, number]

export type ColorCount = {
  count: number
  color: Color
}

export type Histogram = {
  [bin: string]: ColorCount
}
