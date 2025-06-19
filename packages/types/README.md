# @allmaps/types

Allmaps TypeScript types

## Geometry types

The following **Geometries** are used by default Allmaps packages.

```ts
type Point = [number, number]

type LineString = Point[]

type Polygon = Point[][]
// A Polygon is an array of rings of at least three points
// Rings are not closed: the first point is not repeated at the end.
// There is no requirement on winding order.

type MultiPoint = Point[]
// Notice that this is equivalent to the LineString type, hence the `isMultiGeometry` option

type MultiLineString = Point[][]
// Notice that this is equivalent to the Polygon type, hence the `isMultiGeometry` option

type MultiPolygon = Point[][][]

type Geometry =
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon
```

To interact with external data, the following types are used as well:

**GeoJSON Geometries** follow the [GeoJSON specification](https://geojson.org/).

**SVG Geometries** are expressed using the following types (but note that some functions allow svg's to be passed as a string):

```js
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
```

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

* `coordinates` (`Array<Array<number>>`)
* `type` (`'LineString'`)

### `GeojsonMultiGeometry`

###### Type

```ts
GeojsonMultiPoint | GeojsonMultiLineString | GeojsonMultiPolygon
```

### `GeojsonMultiLineString`

###### Fields

* `coordinates` (`Array<Array<Array<number>>>`)
* `type` (`'MultiLineString'`)

### `GeojsonMultiPoint`

###### Fields

* `coordinates` (`Array<Array<number>>`)
* `type` (`'MultiPoint'`)

### `GeojsonMultiPolygon`

###### Fields

* `coordinates` (`Array<Array<Array<Array<number>>>>`)
* `type` (`'MultiPolygon'`)

### `GeojsonPoint`

###### Fields

* `coordinates` (`Array<number>`)
* `type` (`'Point'`)

### `GeojsonPolygon`

###### Fields

* `coordinates` (`Array<Array<Array<number>>>`)
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

### `HomogeneousTransform`

Weights array of a 2D Homogeneous Transform Matrix

These coefficients are used in the same order in multiple places

* CSS Transform defined by a 2D matrix. Use `toString()` before using this as input for a CSS `matrix()` function.
* WebGL 2D transform matrices.
* OpenLayers' transform class.

See: <https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix>
See: <https://openlayers.org/en/latest/apidoc/module-ol_transform.html>

Note: The weights array of a Polynomial1 Transformation has a different order. See the corresponding conversion functions.

###### Type

```ts
[number, number, number, number, number, number]
```

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

### `MultiGeometryOptions`

###### Fields

* `isMultiGeometry` (`false`)

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
Alternatively, two numbers indicating the dimensions of a matrix: rows, cols (which is a different handedness!)

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

### `Triangle`

Triangle
As `[[x0, y0], [x1, y1], [x2, y2]]` (`[Point, Point, Point]`).

Winding order of points is free.

### `TypedGeometry`

###### Type

```ts
P | TypedLineString<P> | TypedPolygon<P> | TypedMultiPoint<P> | TypedMultiLineString<P> | TypedMultiPolygon<...>
```

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
