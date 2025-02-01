# @allmaps/stdlib

Allmaps Standard Library

## API

### `arrayRepeated(array, isEqualObject)`

###### Parameters

* `array` (`Array<T>`)
* `isEqualObject` (`((t0: T, t1: T) => boolean) | undefined`)

###### Returns

`Array<T>`.

### `bboxToCenter(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`[number, number]`.

### `bboxToDiameter(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`number`.

### `bboxToLine(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`[Point, Point]`.

### `bboxToPoint(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`[number, number]`.

### `bboxToPolygon(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`Array<Array<Point>>`.

### `bboxToRectangle(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`[Point, Point, Point, Point]`.

### `bboxToSize(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`[number, number]`.

### `bboxesIntersect(bbox0, bbox1)`

###### Parameters

* `bbox0` (`[number, number, number, number]`)
* `bbox1` (`[number, number, number, number]`)

###### Returns

`Bbox | undefined`.

### `bboxesToScale(bbox0, bbox1)`

###### Parameters

* `bbox0` (`[number, number, number, number]`)
* `bbox1` (`[number, number, number, number]`)

###### Returns

`number`.

### `bufferBbox(bbox, dist0, dist1)`

###### Parameters

* `bbox` (`[number, number, number, number]`)
* `dist0` (`number`)
* `dist1` (`number`)

###### Returns

`[number, number, number, number]`.

### `bufferBboxByRatio(bbox, ratio)`

###### Parameters

* `bbox` (`[number, number, number, number]`)
* `ratio` (`number`)

###### Returns

`[number, number, number, number]`.

### `combineBboxes(bboxes)`

###### Parameters

* `bboxes` (`[number, number, number, number]`)

###### Returns

`Bbox | undefined`.

### `computeBbox(points)`

###### Parameters

* `points` (`Geometry | GeojsonGeometry`)

###### Returns

`[number, number, number, number]`.

### `computeMinMax(values)`

###### Parameters

* `values` (`Array<number>`)

###### Returns

`[number, number]`.

### `conformLineString(lineString)`

###### Parameters

* `lineString` (`Array<Point>`)

###### Returns

`Array<Point>`.

### `conformMultiLineString(multiLineString)`

###### Parameters

* `multiLineString` (`Array<Array<Point>>`)

###### Returns

`Array<Array<Point>>`.

### `conformMultiPolygon(multiPolygon)`

###### Parameters

* `multiPolygon` (`Array<Array<Array<Point>>>`)

###### Returns

`Array<Array<Array<Point>>>`.

### `conformPolygon(polygon)`

###### Parameters

* `polygon` (`Array<Array<Point>>`)

###### Returns

`Array<Array<Point>>`.

### `conformRing(ring)`

###### Parameters

* `ring` (`Array<Point>`)

###### Returns

`Array<Point>`.

### `convexHull(points)`

###### Parameters

* `points` (`Array<Point>`)

###### Returns

`Ring | undefined`.

### `degreesToRadians(degrees)`

###### Parameters

* `degrees` (`number`)

###### Returns

`number`.

### `distance(from)`

###### Parameters

* `from` (`[Point, Point]`)

###### Returns

`number`.

### `doBboxesIntersect(bbox0, bbox1)`

###### Parameters

* `bbox0` (`[number, number, number, number]`)
* `bbox1` (`[number, number, number, number]`)

###### Returns

`boolean`.

### `equalSet(set1, set2)`

###### Parameters

* `set1` (`Set<T> | null`)
* `set2` (`Set<T> | null`)

###### Returns

`boolean`.

### `expandGeojsonMultiGeometryToGeojsonGeometryArray(geojsonMultiGeometry)`

###### Parameters

* `geojsonMultiGeometry` (`GeojsonMultiPoint | GeojsonMultiLineString | GeojsonMultiPolygon`)

###### Returns

`Array<GeojsonPoint> | Array<GeojsonLineString> | Array<GeojsonPolygon>`.

### `expandGeojsonMultiLineStringToGeojsonLineStringArray(geojsonMultiLineString)`

###### Parameters

* `geojsonMultiLineString` (`{type: 'MultiLineString'; coordinates: Point[][]}`)

###### Returns

`Array<GeojsonLineString>`.

### `expandGeojsonMultiPointToGeojsonPointArray(geojsonMultiPoint)`

###### Parameters

* `geojsonMultiPoint` (`{type: 'MultiPoint'; coordinates: Point[]}`)

###### Returns

`Array<GeojsonPoint>`.

### `expandGeojsonMultiPolygonToGeojsonPolygonArray(geojsonMultiPolygon)`

###### Parameters

* `geojsonMultiPolygon` (`{type: 'MultiPolygon'; coordinates: Point[][][]}`)

###### Returns

`Array<GeojsonPolygon>`.

### `featureCollectionToGeometries(featureCollection)`

###### Parameters

* `featureCollection` (`{type: 'FeatureCollection'; features: GeojsonFeature[]}`)

###### Returns

`Array<GeojsonGeometry>`.

### `featureToGeometry(feature)`

###### Parameters

* `feature` (`{type: 'Feature'; properties: unknown; geometry: GeojsonGeometry}`)

###### Returns

`  | GeojsonPoint
  | GeojsonLineString
  | GeojsonPolygon
  | GeojsonMultiPoint
  | GeojsonMultiLineString
  | GeojsonMultiPolygon`.

### `featuresToFeatureCollection(features)`

###### Parameters

* `features` (`GeojsonFeature | Array<GeojsonFeature>`)

###### Returns

`{type: 'FeatureCollection'; features: GeojsonFeature[]}`.

### `fetchAnnotationsFromApi(parsedIiif)`

###### Parameters

* `parsedIiif` (`Image | Manifest | Collection`)

###### Returns

`Promise<Array<unknown>>`.

### `fetchImageBitmap(input, init, fetchFn)`

###### Parameters

* `input` (`RequestInfo | URL`)
* `init?` (`RequestInit | undefined`)
* `fetchFn?` (`FetchFn | undefined`)

###### Returns

`Promise<ImageBitmap>`.

### `fetchImageInfo(imageUri, init, fetchFn)`

###### Parameters

* `imageUri` (`string`)
* `init?` (`RequestInit | undefined`)
* `fetchFn?` (`FetchFn | undefined`)

###### Returns

`Promise<unknown>`.

### `fetchJson(input, init, fetchFn)`

###### Parameters

* `input` (`RequestInfo | URL`)
* `init?` (`RequestInit | undefined`)
* `fetchFn?` (`FetchFn | undefined`)

###### Returns

`Promise<unknown>`.

### `fetchUrl(input, init, fetchFn)`

###### Parameters

* `input` (`RequestInfo | URL`)
* `init?` (`RequestInit | undefined`)
* `fetchFn?` (`FetchFn | undefined`)

###### Returns

`Promise<Response>`.

### `flipX(point)`

###### Parameters

* `point` (`[number, number]`)

###### Returns

`[number, number]`.

### `flipY(point)`

###### Parameters

* `point` (`[number, number]`)

###### Returns

`[number, number]`.

### `geojsonGeometryToGeometry(geojsonGeometry)`

###### Parameters

* `geojsonGeometry` (`  | GeojsonPoint
    | GeojsonLineString
    | GeojsonPolygon
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon`)

###### Returns

`  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon`.

### `geojsonLineStringToLineString(geojsonLineString)`

###### Parameters

* `geojsonLineString` (`{type: 'LineString'; coordinates: Point[]}`)

###### Returns

`Array<Point>`.

### `geojsonMultiLineStringToMultiLineString(geojsonMultiLineString)`

###### Parameters

* `geojsonMultiLineString` (`{type: 'MultiLineString'; coordinates: Point[][]}`)

###### Returns

`Array<Array<Point>>`.

### `geojsonMultiPointToMultiPoint(geojsonMultiPoint)`

###### Parameters

* `geojsonMultiPoint` (`{type: 'MultiPoint'; coordinates: Point[]}`)

###### Returns

`Array<Point>`.

### `geojsonMultiPolygonToMultiPolygon(geojsonMultiPolygon, close)`

###### Parameters

* `geojsonMultiPolygon` (`{type: 'MultiPolygon'; coordinates: Point[][][]}`)
* `close` (`boolean | undefined`)

###### Returns

`Array<Array<Array<Point>>>`.

### `geojsonPointToPoint(geojsonPoint)`

###### Parameters

* `geojsonPoint` (`{type: 'Point'; coordinates: Point}`)

###### Returns

`[number, number]`.

### `geojsonPolygonToPolygon(geojsonPolygon, close)`

###### Parameters

* `geojsonPolygon` (`{type: 'Polygon'; coordinates: Point[][]}`)
* `close` (`boolean | undefined`)

###### Returns

`Array<Array<Point>>`.

### `geojsonPolygonToRing(geojsonPolygon, close)`

###### Parameters

* `geojsonPolygon` (`{type: 'Polygon'; coordinates: Point[][]}`)
* `close` (`boolean | undefined`)

###### Returns

`Array<Point>`.

### `geojsonToSvg(geometry)`

###### Parameters

* `geometry` (`  | GeojsonPoint
    | GeojsonLineString
    | GeojsonPolygon
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon`)

###### Returns

`SvgCircle | SvgLine | SvgPolyLine | SvgPolygon | SvgRect`.

### `geometriesToFeatureCollection(geometries, properties)`

###### Parameters

* `geometries` (`Array<GeojsonGeometry>`)
* `properties?` (`Array<unknown> | undefined`)

###### Returns

`{type: 'FeatureCollection'; features: GeojsonFeature[]}`.

### `geometryToDiameter(geometry)`

###### Parameters

* `geometry` (`Geometry | GeojsonGeometry`)

###### Returns

`number`.

### `geometryToFeature(geometry, properties)`

###### Parameters

* `geometry` (`  | GeojsonPoint
    | GeojsonLineString
    | GeojsonPolygon
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon`)
* `properties?` (`unknown`)

###### Returns

`{type: 'Feature'; properties: unknown; geometry: GeojsonGeometry}`.

### `geometryToGeojsonGeometry(geometry)`

###### Parameters

* `geometry` (`  | Point
    | LineString
    | Polygon
    | MultiPoint
    | MultiLineString
    | MultiPolygon`)

###### Returns

`  | GeojsonPoint
  | GeojsonLineString
  | GeojsonPolygon
  | GeojsonMultiPoint
  | GeojsonMultiLineString
  | GeojsonMultiPolygon`.

### `getColorHistogram(colors, binSize)`

###### Parameters

* `colors` (`Array<Color>`)
* `binSize` (`number | undefined`)

###### Returns

`{[bin: string]: ColorCount}`.

### `getColorsArray(imageData, resolution)`

###### Parameters

* `imageData` (`ImageData`)
* `resolution` (`number | undefined`)

###### Returns

`Array<Color>`.

### `getFullResourceMask(imageWidth, imageHeight)`

###### Parameters

* `imageWidth` (`number`)
* `imageHeight` (`number`)

###### Returns

`Array<Point>`.

### `getImageData(imageBitmap, mask)`

###### Parameters

* `imageBitmap` (`ImageBitmap`)
* `mask?` (`Array<Point> | undefined`)

###### Returns

`ImageData`.

### `getMaxOccurringColor(histogram)`

###### Parameters

* `histogram` (`{[bin: string]: ColorCount}`)

###### Returns

`{count: number; color: Color}`.

### `getPropertyFromCacheOrComputation(cache, key, computation, checkUse, checkStore)`

###### Parameters

* `cache` (`Map<K, T>`)
* `key` (`K`)
* `computation` (`() => T`)
* `checkUse` (`((t: T) => boolean) | undefined`)
* `checkStore` (`((t: T) => boolean) | undefined`)

###### Returns

`T`.

### `getPropertyFromDoubleCacheOrComputation(cache, key0, key1, computation, checkUse, checkStore)`

###### Parameters

* `cache` (`Map<K0, Map<K1, T>>`)
* `key0` (`K0`)
* `key1` (`K1`)
* `computation` (`() => T`)
* `checkUse` (`((t: T) => boolean) | undefined`)
* `checkStore` (`((t: T) => boolean) | undefined`)

###### Returns

`T`.

### `hexToFractionalRgb(hex)`

Convert hex to fractional RGB

###### Parameters

* `hex` (`string`)
  * hex string, e.g. '#0033ff'

###### Returns

Fractional RGB, e (`[number, number, number]`).g. \[0, 0.2, 1]

### `hexToRgb(hex)`

Convert hex to RGB

###### Parameters

* `hex` (`string`)
  * hex string, e.g. '#0033ff'

###### Returns

RGB, e (`[number, number, number]`).g. \[0, 51, 255]

### `invertPoint(point)`

###### Parameters

* `point` (`[number, number]`)

###### Returns

`[number, number]`.

### `invertPoints(points)`

###### Parameters

* `points` (`Array<Point>`)

###### Returns

`Array<Point>`.

### `isClosed(input)`

###### Parameters

* `input` (`Array<Point>`)

###### Returns

`boolean`.

### `isEqualArray(array0, array1, isEqualObject)`

###### Parameters

* `array0` (`Array<T>`)
* `array1` (`Array<T>`)
* `isEqualObject` (`((t0: T, t1: T) => boolean) | undefined`)

###### Returns

`boolean`.

### `isEqualPoint(point0, point1)`

###### Parameters

* `point0` (`[number, number]`)
* `point1` (`[number, number]`)

###### Returns

`boolean`.

### `isEqualPointArray(pointArray0, pointArray1)`

###### Parameters

* `pointArray0` (`Array<Point>`)
* `pointArray1` (`Array<Point>`)

###### Returns

`boolean`.

### `isEqualPointArrayArray(pointArrayArray0, pointArrayArray1)`

###### Parameters

* `pointArrayArray0` (`Array<Array<Point>>`)
* `pointArrayArray1` (`Array<Array<Point>>`)

###### Returns

`boolean`.

### `isGeojsonGeometry(obj)`

###### Parameters

* `obj` (`unknown`)

###### Returns

`boolean`.

### `isGeojsonLineString(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isGeojsonMultiLineString(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isGeojsonMultiPoint(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isGeojsonMultiPolygon(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isGeojsonPoint(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isGeojsonPolygon(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isGeometry(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isLineString(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isMultiLineString(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isMultiPoint(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isMultiPolygon(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isPoint(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isPolygon(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isRing(input)`

###### Parameters

* `input` (`unknown`)

###### Returns

`boolean`.

### `isValidHttpUrl(string)`

###### Parameters

* `string` (`string`)

###### Returns

`boolean`.

### `joinGeojsonGeometryArrayToGeojsonMultiGeometry(geojsonGeometryArray)`

###### Parameters

* `geojsonGeometryArray` (`Array<GeojsonPoint | GeojsonLineString | GeojsonPolygon>`)

###### Returns

`GeojsonMultiPoint | GeojsonMultiLineString | GeojsonMultiPolygon`.

### `joinGeojsonLineStringArrayToGeojsonMultiLineString(geojsonLineStringArray)`

###### Parameters

* `geojsonLineStringArray` (`Array<GeojsonLineString>`)

###### Returns

`{type: 'MultiLineString'; coordinates: Point[][]}`.

### `joinGeojsonPointArrayToGeojsonMultiPoint(geojsonPointArray)`

###### Parameters

* `geojsonPointArray` (`Array<GeojsonPoint>`)

###### Returns

`{type: 'MultiPoint'; coordinates: Point[]}`.

### `joinGeojsonPolygonArrayToGeojsonMultiPolygon(geojsonPolygonArray)`

###### Parameters

* `geojsonPolygonArray` (`Array<GeojsonPolygon>`)

###### Returns

`{type: 'MultiPolygon'; coordinates: Point[][][]}`.

### `lineAngle(line)`

###### Parameters

* `line` (`[Point, Point]`)

###### Returns

`number`.

### `lineStringToGeojsonLineString(lineString)`

###### Parameters

* `lineString` (`Array<Point>`)

###### Returns

`{type: 'LineString'; coordinates: Point[]}`.

### `lineStringToLines(lineString)`

###### Parameters

* `lineString` (`Array<Point>`)

###### Returns

`Array<Line>`.

### `linesIntersectionPoint(line0, line1, options)`

###### Parameters

* `line0` (`[Point, Point]`)
* `line1` (`[Point, Point]`)
* `options?` (`Partial<IntersectionOptions> | undefined`)

###### Returns

`Point | undefined`.

### `lonLatToWebMecator(__0)`

###### Parameters

* `undefined` (`[number, number]`)

###### Returns

`[number, number]`.

### `mapToResourceMaskSvgPolygon(map)`

###### Parameters

* `map` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; i...`)

###### Returns

`{type: 'polygon'; attributes?: SvgAttributes; coordinates: Point[]}`.

### `maxOfNumberOrUndefined(number1, number2)`

###### Parameters

* `number1` (`number | undefined`)
* `number2` (`number | undefined`)

###### Returns

`number | undefined`.

### `mergeOptions(options, partialOptions)`

###### Parameters

* `options` (`Options`)
* `partialOptions?` (`Partial<Options> | undefined`)

###### Returns

`Options`.

### `mergePartialOptions(partialOptions0, partialOptions1)`

###### Parameters

* `partialOptions0?` (`Partial<Options> | undefined`)
* `partialOptions1?` (`Partial<Options> | undefined`)

###### Returns

`{[P in keyof Options]?: Options[P] | undefined}`.

### `midPoint(points)`

###### Parameters

* `points` (`[number, number]`)

###### Returns

`[number, number]`.

### `mixNumbers(number0, number1, t)`

###### Parameters

* `number0` (`number`)
* `number1` (`number`)
* `t` (`number`)

###### Returns

`number`.

### `mixPoints(point0, point1, t)`

###### Parameters

* `point0` (`[number, number]`)
* `point1` (`[number, number]`)
* `t` (`number`)

###### Returns

`[number, number]`.

### `multiLineStringToGeojsonMultiLineString(multiLineString)`

###### Parameters

* `multiLineString` (`Array<Array<Point>>`)

###### Returns

`{type: 'MultiLineString'; coordinates: Point[][]}`.

### `multiPointToGeojsonMultiPoint(multiPoint)`

###### Parameters

* `multiPoint` (`Array<Point>`)

###### Returns

`{type: 'MultiPoint'; coordinates: Point[]}`.

### `multiPolygonToGeojsonMultiPolygon(multiPolygon, close)`

###### Parameters

* `multiPolygon` (`Array<Array<Array<Point>>>`)
* `close` (`boolean | undefined`)

###### Returns

`{type: 'MultiPolygon'; coordinates: Point[][][]}`.

### `pixelToIntArrayIndex(pixel, size, channels, flipY)`

###### Parameters

* `pixel` (`[number, number]`)
* `size` (`[number, number]`)
* `channels` (`number`)
* `flipY` (`boolean | undefined`)

###### Returns

`number`.

### `pointInBbox(point, bbox)`

###### Parameters

* `point` (`[number, number]`)
* `bbox` (`[number, number, number, number]`)

###### Returns

`boolean`.

### `pointToGeojsonPoint(point)`

###### Parameters

* `point` (`[number, number]`)

###### Returns

`{type: 'Point'; coordinates: Point}`.

### `pointToPixel(point, translate)`

###### Parameters

* `point` (`[number, number]`)
* `translate` (`Point | undefined`)

###### Returns

`[number, number]`.

### `pointsAndPointsToLines(points0, points1)`

###### Parameters

* `points0` (`Array<Point>`)
* `points1` (`Array<Point>`)

###### Returns

`Array<Line>`.

### `polygonSelfIntersectionPoints(polygon, options)`

###### Parameters

* `polygon` (`Array<Array<Point>>`)
* `options?` (`Partial<IntersectionOptions> | undefined`)

###### Returns

`Array<Point>`.

### `polygonToGeojsonPolygon(polygon, close)`

###### Parameters

* `polygon` (`Array<Array<Point>>`)
* `close` (`boolean | undefined`)

###### Returns

`{type: 'Polygon'; coordinates: Point[][]}`.

### `prolongedLinesIntersectionPoint(line0, line1)`

###### Parameters

* `line0` (`[Point, Point]`)
* `line1` (`[Point, Point]`)

###### Returns

`Point | undefined`.

### `rectangleToSize(rectangle)`

###### Parameters

* `rectangle` (`[Point, Point, Point, Point]`)

###### Returns

`[number, number]`.

### `rectanglesToScale(rectangle0, rectangle1)`

###### Parameters

* `rectangle0` (`[Point, Point, Point, Point]`)
* `rectangle1` (`[Point, Point, Point, Point]`)

###### Returns

`number`.

### `rgbToHex(__0)`

Convert RBG to hex

###### Parameters

* `undefined` (`[number, number, number]`)
  * RGB color array, e.g. \[0, 51, 255]

###### Returns

hex string, e (`string`).g. '#0033ff'

### `ringToGeojsonPolygon(ring, close)`

###### Parameters

* `ring` (`Array<Point>`)
* `close` (`boolean | undefined`)

###### Returns

`{type: 'Polygon'; coordinates: Point[][]}`.

### `rms(from, to)`

###### Parameters

* `from` (`Array<Point>`)
* `to` (`Array<Point>`)

###### Returns

`number`.

### `rotatePoint(point, angle, anchor, cosAngle, sinAngle)`

###### Parameters

* `point` (`[number, number]`)
* `angle` (`number | undefined`)
* `anchor` (`Point | undefined`)
* `cosAngle?` (`number | undefined`)
* `sinAngle?` (`number | undefined`)

###### Returns

`[number, number]`.

### `rotatePoints(points, angle, anchor, cosAngle, sinAngle)`

###### Parameters

* `points` (`Array<Point>`)
* `angle` (`number | undefined`)
* `anchor` (`Point | undefined`)
* `cosAngle?` (`number | undefined`)
* `sinAngle?` (`number | undefined`)

###### Returns

`Array<Point>`.

### `scalePoint(point, scale)`

###### Parameters

* `point` (`[number, number]`)
* `scale` (`number`)

###### Returns

`[number, number]`.

### `scalePoints(points, scale)`

###### Parameters

* `points` (`Array<Point>`)
* `scale` (`number`)

###### Returns

`Array<Point>`.

### `scaleSize(size, scale)`

###### Parameters

* `size` (`[number, number]`)
* `scale` (`number`)

###### Returns

`[number, number]`.

### `sizeToBbox(size)`

###### Parameters

* `size` (`[number, number]`)

###### Returns

`[number, number, number, number]`.

### `sizeToCenter(size)`

###### Parameters

* `size` (`[number, number]`)

###### Returns

`[number, number]`.

### `sizeToRectangle(size)`

###### Parameters

* `size` (`[number, number]`)

###### Returns

`[Point, Point, Point, Point]`.

### `sizeToResolution(size)`

###### Parameters

* `size` (`[number, number]`)

###### Returns

`number`.

### `sizesToScale(size0, size1, fit)`

Compute a size from two scales

For unspecified 'fit', the scale is computed based on the surface area derived from the sizes.

For specified 'fit':

Example for square rectangles '\*' and '+':

'contain' where '\*' contains '.'
(in the first image size0 is relatively wider)

```
           ****
           *  *
```

**....**     ....

* .  . \*     .  .
  **....**     ....
  \*  \*
  \*\*\*\*

'cover' where '\*' is covered by '.'
(in the first image size0 is relatively wider)

```
           ....
           .  .
```

..****..     \*\*\*\*
. \*  \* .     \*  \*
..****..     \*\*\*\*
.  .
....

###### Parameters

* `size0` (`[number, number]`)
  * first size
* `size1` (`[number, number]`)
  * second size
* `fit?` (`Fit | undefined`)
  * fit

###### Returns

`number`.

### `squaredDistance(from)`

###### Parameters

* `from` (`[Point, Point]`)

###### Returns

`number`.

### `stepDistanceAngle(point, dist, angle)`

###### Parameters

* `point` (`[number, number]`)
* `dist` (`number`)
* `angle` (`number`)

###### Returns

`[number, number]`.

### `stringToSvgGeometriesGenerator(svg)`

###### Parameters

* `svg` (`string`)

###### Returns

`Generator<SvgGeometry, void, unknown>`.

### `subSetArray(arr1, arr2)`

###### Parameters

* `arr1` (`Array<T>`)
* `arr2` (`Array<T>`)

###### Returns

`boolean`.

### `svgGeometriesToSvgString(geometries)`

###### Parameters

* `geometries` (`Array<SvgGeometry>`)

###### Returns

`string`.

### `svgToGeojson(geometry)`

###### Parameters

* `geometry` (`SvgCircle | SvgLine | SvgPolyLine | SvgPolygon | SvgRect`)

###### Returns

`  | GeojsonPoint
  | GeojsonLineString
  | GeojsonPolygon
  | GeojsonMultiPoint
  | GeojsonMultiLineString
  | GeojsonMultiPolygon`.

### `translatePoint(point, translationPoint, addOrSubstract)`

###### Parameters

* `point` (`[number, number]`)
* `translationPoint` (`[number, number]`)
* `addOrSubstract` (`'add' | 'substract' | undefined`)

###### Returns

`[number, number]`.

### `translatePoints(points, point, addOrSubstract)`

###### Parameters

* `points` (`Array<Point>`)
* `point` (`[number, number]`)
* `addOrSubstract` (`'add' | 'substract' | undefined`)

###### Returns

`Array<Point>`.

### `triangleArea(triangle)`

###### Parameters

* `triangle` (`[Point, Point, Point]`)

###### Returns

`number`.

### `webMercatorToLonLat(__0)`

###### Parameters

* `undefined` (`[number, number]`)

###### Returns

`[number, number]`.
