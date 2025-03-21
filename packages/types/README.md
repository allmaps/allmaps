# @allmaps/types

Allmaps TypeScript types

## License

MIT

## API

### `Bbox`

Bbox (`[number, number, number, number]`). Defined as \[xMin, yMin, xMax, yMax]

### `Color`

###### Type

```ts
[number, number, number]
```

### `ColorCount`

###### Fields

* `color` (`[number, number, number]`)
* `count` (`number`)

### `ColorWithTransparancy`

###### Type

```ts
[number, number, number, number]
```

### `FetchFn`

###### Type

```ts
(
  input: Request | string | URL,
  init?: RequestInit
) => Promise<Response>
```

### `Fit`

Two ways two rectangles (or shapes in general) can overlap: (`'cover' | 'contain'`).

* 'contain': The first contains the second
* 'cover': The first is covered by the second

### `Gcp`

###### Fields

* `geo` (`[number, number]`)
* `resource` (`[number, number]`)

### `GeojsonFeature`

###### Fields

* `geometry` (`  | GeojsonPoint
    | GeojsonLineString
    | GeojsonPolygon
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon`)
* `properties` (`unknown`)
* `type` (`'Feature'`)

### `GeojsonFeatureCollection`

###### Fields

* `features` (`Array<GeojsonFeature>`)
* `type` (`'FeatureCollection'`)

### `GeojsonGeometry`

###### Type

```ts
  | GeojsonPoint
  | GeojsonLineString
  | GeojsonPolygon
  | GeojsonMultiPoint
  | GeojsonMultiLineString
  | GeojsonMultiPolygon
```

### `GeojsonGeometryType`

###### Type

```ts
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon'
```

### `GeojsonLineString`

###### Fields

* `coordinates` (`Array<Point>`)
* `type` (`'LineString'`)

### `GeojsonMultiLineString`

###### Fields

* `coordinates` (`Array<Array<Point>>`)
* `type` (`'MultiLineString'`)

### `GeojsonMultiPoint`

###### Fields

* `coordinates` (`Array<Point>`)
* `type` (`'MultiPoint'`)

### `GeojsonMultiPolygon`

###### Fields

* `coordinates` (`Array<Array<Array<Point>>>`)
* `type` (`'MultiPolygon'`)

### `GeojsonPoint`

###### Fields

* `coordinates` (`[number, number]`)
* `type` (`'Point'`)

### `GeojsonPolygon`

###### Fields

* `coordinates` (`Array<Array<Point>>`)
* `type` (`'Polygon'`)

### `Geometry`

###### Type

```ts
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon
```

### `Histogram`

###### Fields

* `[bin: string]` (`{count: number; color: Color}`)

### `ImageInformations`

###### Type

```ts
Map<string, unknown>
```

### `ImageRequest`

###### Fields

* `region?` (`{x: number; y: number; width: number; height: number}`)
* `size?` (`{width: number; height: number}`)

### `Line`

###### Type

```ts
[Point, Point]
```

### `LineString`

###### Type

```ts
Array<Point>
```

### `Matrix4`

###### Type

```ts
[
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]
```

### `MultiLineString`

###### Type

```ts
Array<Array<Point>>
```

### `MultiPoint`

###### Type

```ts
Array<Point>
```

### `MultiPolygon`

###### Type

```ts
Array<Array<Array<Point>>>
```

### `Point`

###### Type

```ts
[number, number]
```

### `Polygon`

###### Type

```ts
Array<Array<Point>>
```

### `Rectangle`

Rectangle (or possibly quadrilateral) (`[Point, Point, Point, Point]`). Winding order of points is free.

### `Region`

###### Fields

* `height` (`number`)
* `width` (`number`)
* `x` (`number`)
* `y` (`number`)

### `Ring`

Ring as `[[number, number], ...]` (`Array<Point>`).

Must contain at least 3 points
May not contain duplicate points
Must be unclosed: last element is not a repetition of the first
May not be self-intersecting
So far no requirement on self-intersection although that may be useful in future
So far no requirement on winding order. This is only applied when exporting to GeoJSON

### `Size`

Two numbers indicating the size of a Bbox as \[width, height] or \[xSize, ySize] (`[number, number]`).
Alternatively, two numbers indicating the minimum and maximum of, for example, an array of numbers

### `SizeObject`

###### Fields

* `height` (`number`)
* `width` (`number`)

### `SvgAttributes`

###### Type

```ts
{[x: string]: string | number}
```

### `SvgCircle`

###### Fields

* `attributes?` (`{[x: string]: string | number}`)
* `coordinates` (`[number, number]`)
* `type` (`'circle'`)

### `SvgGeometry`

###### Type

```ts
SvgCircle | SvgLine | SvgPolyLine | SvgPolygon | SvgRect
```

### `SvgLine`

###### Fields

* `attributes?` (`{[x: string]: string | number}`)
* `coordinates` (`[Point, Point]`)
* `type` (`'line'`)

### `SvgPolyLine`

###### Fields

* `attributes?` (`{[x: string]: string | number}`)
* `coordinates` (`Array<Point>`)
* `type` (`'polyline'`)

### `SvgPolygon`

###### Fields

* `attributes?` (`{[x: string]: string | number}`)
* `coordinates` (`Array<Point>`)
* `type` (`'polygon'`)

### `SvgRect`

###### Fields

* `attributes?` (`{[x: string]: string | number}`)
* `coordinates` (`Array<Point>`)
* `type` (`'rect'`)

### `Tile`

###### Fields

* `column` (`number`)
* `imageSize` (`[number, number]`)
* `row` (`number`)
* `tileZoomLevel` (`{
    scaleFactor: number
    width: number
    height: number
    originalWidth: number
    originalHeight: number
    columns: number
    rows: number
  }`)

### `TileByColumn`

###### Fields

* `[key: number]` (`[number, number]`)

### `TileZoomLevel`

###### Fields

* `columns` (`number`)
* `height` (`number`)
* `originalHeight` (`number`)
* `originalWidth` (`number`)
* `rows` (`number`)
* `scaleFactor` (`number`)
* `width` (`number`)

### `Transform`

###### Type

```ts
[number, number, number, number, number, number]
```

### `Triangle`

Triangle
As `[[x0, y0], [x1, y1], [x2, y2]]` (`[Point, Point, Point]`).

Winding order of points is free.

### `TypedLine`

###### Type

```ts
[P, P]
```

### `TypedLineString`

###### Type

```ts
Array<P>
```

### `TypedMultiLineString`

###### Type

```ts
Array<Array<P>>
```

### `TypedMultiPoint`

###### Type

```ts
Array<P>
```

### `TypedMultiPolygon`

###### Type

```ts
Array<Array<Array<P>>>
```

### `TypedPolygon`

###### Type

```ts
Array<Array<P>>
```

### `TypedRectangle`

###### Type

```ts
[P, P, P, P]
```

### `TypedRing`

###### Type

```ts
Array<P>
```

### `TypedTriangle`

###### Type

```ts
[P, P, P]
```
