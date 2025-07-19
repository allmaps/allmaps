# @allmaps/stdlib

Allmaps Standard Library

## License

MIT

## API

### `arrayMatrixSize(arrayMatrix)`

###### Parameters

* `arrayMatrix` (`Array<Array<T>>`)

###### Returns

`[number, number]`.

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

### `bboxToResolution(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`number`.

### `bboxToSize(bbox)`

###### Parameters

* `bbox` (`[number, number, number, number]`)

###### Returns

`[number, number]`.

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

### `closeMultiPolygon(multiPolygon)`

###### Parameters

* `multiPolygon` (`Array<Array<Array<Point>>>`)

###### Returns

`Array<Array<Array<Point>>>`.

### `closePolygon(polygon)`

###### Parameters

* `polygon` (`Array<Array<Point>>`)

###### Returns

`Array<Array<Point>>`.

### `closeRing(ring)`

###### Parameters

* `ring` (`Array<Point>`)

###### Returns

`Array<Point>`.

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

### `contractGeojsonGeometriesToGeojsonMultiGeometry(geojsonGeometries)`

###### Parameters

* `geojsonGeometries` (`Array<GeojsonPoint | GeojsonLineString | GeojsonPolygon>`)

###### Returns

`GeojsonMultiPoint | GeojsonMultiLineString | GeojsonMultiPolygon`.

### `contractGeojsonLineStringsToGeojsonMultiLineString(geojsonLineStrings)`

###### Parameters

* `geojsonLineStrings` (`Array<GeojsonLineString>`)

###### Returns

`{type: 'MultiLineString'; coordinates: number[][][]}`.

### `contractGeojsonPointsToGeojsonMultiPoint(geojsonPoints)`

###### Parameters

* `geojsonPoints` (`Array<GeojsonPoint>`)

###### Returns

`{type: 'MultiPoint'; coordinates: number[][]}`.

### `contractGeojsonPolygonsToGeojsonMultiPolygon(geojsonPolygons)`

###### Parameters

* `geojsonPolygons` (`Array<GeojsonPolygon>`)

###### Returns

`{type: 'MultiPolygon'; coordinates: number[][][][]}`.

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

### `expandGeojsonMultiGeometryToGeojsonGeometries(geojsonMultiGeometry)`

###### Parameters

* `geojsonMultiGeometry` (`GeojsonMultiPoint | GeojsonMultiLineString | GeojsonMultiPolygon`)

###### Returns

`Array<GeojsonPoint> | Array<GeojsonLineString> | Array<GeojsonPolygon>`.

### `expandGeojsonMultiLineStringToGeojsonLineStrings(geojsonMultiLineString)`

###### Parameters

* `geojsonMultiLineString` (`{type: 'MultiLineString'; coordinates: number[][][]}`)

###### Returns

`Array<GeojsonLineString>`.

### `expandGeojsonMultiPointToGeojsonPoints(geojsonMultiPoint)`

###### Parameters

* `geojsonMultiPoint` (`{type: 'MultiPoint'; coordinates: number[][]}`)

###### Returns

`Array<GeojsonPoint>`.

### `expandGeojsonMultiPolygonToGeojsonPolygons(geojsonMultiPolygon)`

###### Parameters

* `geojsonMultiPolygon` (`{type: 'MultiPolygon'; coordinates: number[][][][]}`)

###### Returns

`Array<GeojsonPolygon>`.

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

### `geojsonFeatureCollectionToGeojsonGeometries(geojsonFeatureCollection)`

###### Parameters

* `geojsonFeatureCollection` (`{type: 'FeatureCollection'; features: GeojsonFeature[]}`)

###### Returns

`Array<GeojsonGeometry>`.

### `geojsonFeatureToGeojsonGeometry(geojsonFeature)`

###### Parameters

* `geojsonFeature` (`{type: 'Feature'; properties: unknown; geometry: GeojsonGeometry}`)

###### Returns

`  | GeojsonPoint
  | GeojsonLineString
  | GeojsonPolygon
  | GeojsonMultiPoint
  | GeojsonMultiLineString
  | GeojsonMultiPolygon`.

### `geojsonFeaturesToGeojsonFeatureCollection(geojsonFeatures)`

###### Parameters

* `geojsonFeatures` (`GeojsonFeature | Array<GeojsonFeature>`)

###### Returns

`{type: 'FeatureCollection'; features: GeojsonFeature[]}`.

### `geojsonGeometriesToGeojsonFeatureCollection(geojsonGeometries, properties)`

###### Parameters

* `geojsonGeometries` (`Array<GeojsonGeometry>`)
* `properties?` (`Array<unknown> | undefined`)

###### Returns

`{type: 'FeatureCollection'; features: GeojsonFeature[]}`.

### `geojsonGeometryToGeojsonFeature(geojsonGeometry, properties)`

###### Parameters

* `geojsonGeometry` (`  | GeojsonPoint
    | GeojsonLineString
    | GeojsonPolygon
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon`)
* `properties?` (`unknown`)

###### Returns

`{type: 'Feature'; properties: unknown; geometry: GeojsonGeometry}`.

### `geojsonGeometryToGeometry(geojsonPoint)`

###### Parameters

* `geojsonPoint` (`{type: 'Point'; coordinates: number[]}`)

###### Returns

`[number, number]`.

### `geojsonGeometryToSvgGeometry(geojsonGeometry)`

###### Parameters

* `geojsonGeometry` (`  | GeojsonPoint
    | GeojsonLineString
    | GeojsonPolygon
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon`)

###### Returns

`SvgCircle | SvgLine | SvgPolyLine | SvgPolygon | SvgRect`.

### `geojsonLineStringToLineString(geojsonLineString)`

###### Parameters

* `geojsonLineString` (`{type: 'LineString'; coordinates: number[][]}`)

###### Returns

`Array<Point>`.

### `geojsonMultiLineStringToMultiLineString(geojsonMultiLineString)`

###### Parameters

* `geojsonMultiLineString` (`{type: 'MultiLineString'; coordinates: number[][][]}`)

###### Returns

`Array<Array<Point>>`.

### `geojsonMultiPointToMultiPoint(geojsonMultiPoint)`

###### Parameters

* `geojsonMultiPoint` (`{type: 'MultiPoint'; coordinates: number[][]}`)

###### Returns

`Array<Point>`.

### `geojsonMultiPolygonToMultiPolygon(geojsonMultiPolygon, close)`

###### Parameters

* `geojsonMultiPolygon` (`{type: 'MultiPolygon'; coordinates: number[][][][]}`)
* `close` (`boolean | undefined`)

###### Returns

`Array<Array<Array<Point>>>`.

### `geojsonPointToPoint(geojsonPoint)`

###### Parameters

* `geojsonPoint` (`{type: 'Point'; coordinates: number[]}`)

###### Returns

`[number, number]`.

### `geojsonPolygonToPolygon(geojsonPolygon, close)`

###### Parameters

* `geojsonPolygon` (`{type: 'Polygon'; coordinates: number[][][]}`)
* `close` (`boolean | undefined`)

###### Returns

`Array<Array<Point>>`.

### `geojsonPolygonToRing(geojsonPolygon, close)`

###### Parameters

* `geojsonPolygon` (`{type: 'Polygon'; coordinates: number[][][]}`)
* `close` (`boolean | undefined`)

###### Returns

`Array<Point>`.

### `geometryToDiameter(geometry)`

###### Parameters

* `geometry` (`Geometry | GeojsonGeometry`)

###### Returns

`number`.

### `geometryToGeojsonGeometry(point, options)`

###### Parameters

* `point` (`[number, number]`)
* `options?` (`Partial<MultiGeometryOptions> | undefined`)

###### Returns

`{type: 'Point'; coordinates: number[]}`.

### `geometryToSvgGeometry(point)`

###### Parameters

* `point` (`[number, number]`)

###### Returns

`{type: 'circle'; attributes?: SvgAttributes; coordinates: Point}`.

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

### `getPropertyFromTripleCacheOrComputation(cache, key0, key1, key2, computation, checkUse, checkStore)`

###### Parameters

* `cache` (`Map<K0, Map<K1, Map<K2, T>>>`)
* `key0` (`K0`)
* `key1` (`K1`)
* `key2` (`K2`)
* `computation` (`() => T`)
* `checkUse` (`((t: T) => boolean) | undefined`)
* `checkStore` (`((t: T) => boolean) | undefined`)

###### Returns

`T`.

### `groupBy(arr, key)`

###### Parameters

* `arr` (`Array<T>`)
* `key` (`(i: T) => K`)

###### Returns

`{[P in K]: Array<T>}`.

### `hexToFractionalOpaqueRgba(hex)`

Convert hex to fractional RGBA, and sets the transparency to 1

###### Parameters

* `hex` (`string`)
  * hex string, e.g. '#0033ffcc'

###### Returns

Fractional RGB, e (`[number, number, number, number]`).g. \[0, 0.2, 1, 1]

### `hexToFractionalRgb(hex)`

Convert hex to fractional RGB

###### Parameters

* `hex` (`string`)
  * hex string, e.g. '#0033ff'

###### Returns

Fractional RGB, e (`[number, number, number]`).g. \[0, 0.2, 1]

### `hexToFractionalRgba(hex)`

Convert hex to fractional RGBA

###### Parameters

* `hex` (`string`)
  * hex string, e.g. '#0033ffff'

###### Returns

Fractional RGB, e (`[number, number, number, number]`).g. \[0, 0.2, 1, 1]

### `hexToOpaqueRgba(hex)`

Convert HEX to RGB, and sets the transparency to 255

###### Parameters

* `hex` (`string`)
  * HEX string, e.g. '#0033ffcc'

###### Returns

RGB, e (`[number, number, number, number]`).g. \[0, 51, 255, 255]

### `hexToRgb(hex)`

Convert HEX to RGB

###### Parameters

* `hex` (`string`)
  * HEX string, e.g. '#0033ff'

###### Returns

RGB, e (`[number, number, number]`).g. \[0, 51, 255]

### `hexToRgba(hex)`

Convert HEX to RGB

###### Parameters

* `hex` (`string`)
  * HEX string, e.g. '#0033ffff'

###### Returns

RGB, e (`[number, number, number, number]`).g. \[0, 51, 255, 255]

### `intersectBboxes(bbox0, bbox1)`

###### Parameters

* `bbox0` (`[number, number, number, number]`)
* `bbox1` (`[number, number, number, number]`)

###### Returns

`Bbox | undefined`.

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

### `isGeojsonMultiGeometry(obj)`

###### Parameters

* `obj` (`unknown`)

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

### `isSvgCircle(input)`

###### Parameters

* `input` (`any`)

###### Returns

`boolean`.

### `isSvgLine(input)`

###### Parameters

* `input` (`any`)

###### Returns

`boolean`.

### `isSvgPolyLine(input)`

###### Parameters

* `input` (`any`)

###### Returns

`boolean`.

### `isSvgPolygon(input)`

###### Parameters

* `input` (`any`)

###### Returns

`boolean`.

### `isSvgRect(input)`

###### Parameters

* `input` (`any`)

###### Returns

`boolean`.

### `isValidHttpUrl(string)`

###### Parameters

* `string` (`string`)

###### Returns

`boolean`.

### `lineAngle(line)`

###### Parameters

* `line` (`[Point, Point]`)

###### Returns

`number`.

### `lineStringToGeojsonLineString(lineString)`

###### Parameters

* `lineString` (`Array<Point>`)

###### Returns

`{type: 'LineString'; coordinates: number[][]}`.

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

### `mapToResourceMaskSvgPolygon(map)`

###### Parameters

* `map` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; i...`)

###### Returns

`{type: 'polygon'; attributes?: SvgAttributes; coordinates: Ring}`.

### `maxOfNumberOrUndefined(number1, number2)`

###### Parameters

* `number1` (`number | undefined`)
* `number2` (`number | undefined`)

###### Returns

`number | undefined`.

### `mergeGeojsonFeaturesCollections(geojsonFeatureCollections)`

###### Parameters

* `geojsonFeatureCollections` (`Array<GeojsonFeatureCollection>`)

###### Returns

`{type: 'FeatureCollection'; features: GeojsonFeature[]}`.

### `mergeOptions(options0, options1)`

###### Parameters

* `options0` (`Options0`)
* `options1?` (`Options1 | undefined`)

###### Returns

`Options0 & Options1`.

### `mergeOptionsUnlessUndefined(options0, options1)`

###### Parameters

* `options0` (`Options0`)
* `options1?` (`Options1 | undefined`)

###### Returns

`Options0 &
  Partial<{[K in keyof Options1]: Exclude<Options1[K], undefined>}>`.

### `mergePartialOptions(partialOptionsArray)`

###### Parameters

* `partialOptionsArray` (`Partial<Options> | undefined`)

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

`{type: 'MultiLineString'; coordinates: number[][][]}`.

### `multiPointToGeojsonMultiPoint(multiPoint)`

###### Parameters

* `multiPoint` (`Array<Point>`)

###### Returns

`{type: 'MultiPoint'; coordinates: number[][]}`.

### `multiPolygonToGeojsonMultiPolygon(multiPolygon, close)`

###### Parameters

* `multiPolygon` (`Array<Array<Array<Point>>>`)
* `close` (`boolean | undefined`)

###### Returns

`{type: 'MultiPolygon'; coordinates: number[][][][]}`.

### `multiplyArrayMatrix(arrayMatrix, factor)`

###### Parameters

* `arrayMatrix` (`Array<Array<number>>`)
* `factor` (`number`)

###### Returns

`Array<Array<number>>`.

### `newArrayMatrix(rows, cols, value)`

Create and fill a ArrayMatrix: an Arrays of Arrays, that can later be loaded as a ml-matrix Matrix

###### Parameters

* `rows` (`number`)
* `cols` (`number`)
* `value` (`T | undefined`)

###### Returns

`Array<Array<T>>`.

### `newBlockArrayMatrix(blocks, emptyValue)`

###### Parameters

* `blocks` (`Array<Array<Array<Array<T>>>>`)
* `emptyValue` (`T | undefined`)

###### Returns

`Array<Array<T>>`.

### `pasteArrayMatrix(arrayMatrix, rowsStart, colsStart, subArrayMatrix)`

###### Parameters

* `arrayMatrix` (`Array<Array<T>>`)
* `rowsStart` (`number`)
* `colsStart` (`number`)
* `subArrayMatrix` (`Array<Array<T>>`)

###### Returns

`Array<Array<T>>`.

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

`{type: 'Point'; coordinates: number[]}`.

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

`{type: 'Polygon'; coordinates: number[][][]}`.

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

### `rgbToHex(color)`

Convert RBG to HEX

###### Parameters

* `color` (`[number, number, number]`)

###### Returns

HEX string, e (`string`).g. '#0033ff'

### `rgbaToHex(color)`

Convert RBGA to HEX

###### Parameters

* `color` (`[number, number, number, number]`)

###### Returns

HEX string, e (`string`).g. '#0033ffff'

### `ringToGeojsonPolygon(ring, close)`

###### Parameters

* `ring` (`Array<Point>`)
* `close` (`boolean | undefined`)

###### Returns

`{type: 'Polygon'; coordinates: number[][][]}`.

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

### `shallowCopyArrayMatrix(arrayMatrix)`

###### Parameters

* `arrayMatrix` (`Array<Array<T>>`)

###### Returns

`Array<Array<T>>`.

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

### `sliceArrayMatrix(arrayMatrix, rowsStart, colsStart, rowsEnd, colsEnd)`

###### Parameters

* `arrayMatrix` (`Array<Array<T>>`)
* `rowsStart` (`number`)
* `colsStart` (`number`)
* `rowsEnd?` (`number | undefined`)
* `colsEnd?` (`number | undefined`)

###### Returns

`Array<Array<T>>`.

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

### `subArrayMatrix(arrayMatrix, rows, cols)`

###### Parameters

* `arrayMatrix` (`Array<Array<T>>`)
* `rows` (`Array<number>`)
* `cols` (`Array<number>`)

###### Returns

`Array<Array<T>>`.

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

### `svgGeometryToGeometry(svgCircle)`

###### Parameters

* `svgCircle` (`{type: 'circle'; attributes?: SvgAttributes; coordinates: Point}`)

###### Returns

`[number, number]`.

### `svgGeometryToString(geometry)`

###### Parameters

* `geometry` (`SvgCircle | SvgLine | SvgPolyLine | SvgPolygon | SvgRect`)

###### Returns

`string`.

### `threePointsToAngle(pointA, pointB, pointC)`

Return angle alpha made at point A by points B and C

###### Parameters

* `pointA` (`[number, number]`)
* `pointB` (`[number, number]`)
* `pointC` (`[number, number]`)

###### Returns

`number`.

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

### `transposeArrayMatrix(arrayMatrix)`

###### Parameters

* `arrayMatrix` (`Array<Array<T>>`)

###### Returns

`Array<Array<T>>`.

### `triangleAngles(triangle)`

###### Parameters

* `triangle` (`[Point, Point, Point]`)

###### Returns

`[number, number, number]`.

### `triangleArea(triangle)`

###### Parameters

* `triangle` (`[Point, Point, Point]`)

###### Returns

`number`.

### `uncloseMultiPolygon(multiPolygon)`

###### Parameters

* `multiPolygon` (`Array<Array<Array<Point>>>`)

###### Returns

`Array<Array<Array<Point>>>`.

### `unclosePolygon(polygon)`

###### Parameters

* `polygon` (`Array<Array<Point>>`)

###### Returns

`Array<Array<Point>>`.

### `uncloseRing(ring)`

###### Parameters

* `ring` (`Array<Point>`)

###### Returns

`Array<Point>`.
