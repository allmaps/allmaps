export { fetchAnnotationsFromApi } from './api.js'

export {
  getImageData,
  getColorsArray,
  getColorHistogram,
  getMaxOccurringColor
} from './background-color.js'

export {
  computeMinMax,
  computeBbox,
  combineBboxes,
  doBboxesIntersect,
  bboxesIntersect,
  pointInBbox,
  bufferBbox,
  bufferBboxByRatio,
  bboxToRectangle,
  bboxToPolygon,
  bboxToLine,
  bboxToDiameter,
  geometryToDiameter,
  bboxToCenter,
  bboxToSize,
  rectangleToSize,
  convexHull,
  sizesToScale,
  scaleSize,
  sizeToResolution,
  sizeToCenter,
  sizeToBbox,
  sizeToRectangle,
  bboxesToScale,
  rectanglesToScale
} from './bbox.js'

export {
  getPropertyFromCacheOrComputation,
  getPropertyFromDoubleCacheOrComputation
} from './cache.js'

export { rgbToHex, hexToRgb, hexToFractionalRgb } from './color.js'

export {
  fetchUrl,
  fetchJson,
  fetchImageInfo,
  fetchImageBitmap
} from './fetch.js'

export {
  isGeojsonPoint,
  isGeojsonLineString,
  isGeojsonPolygon,
  isGeojsonMultiPoint,
  isGeojsonMultiLineString,
  isGeojsonMultiPolygon,
  isGeojsonGeometry,
  geojsonPointToPoint,
  geojsonLineStringToLineString,
  geojsonPolygonToRing,
  geojsonPolygonToPolygon,
  geojsonMultiPointToMultiPoint,
  geojsonMultiLineStringToMultiLineString,
  geojsonMultiPolygonToMultiPolygon,
  geojsonGeometryToGeometry,
  expandGeojsonMultiPointToGeojsonPointArray,
  expandGeojsonMultiLineStringToGeojsonLineStringArray,
  expandGeojsonMultiPolygonToGeojsonPolygonArray,
  expandGeojsonMultiGeometryToGeojsonGeometryArray,
  joinGeojsonPointArrayToGeojsonMultiPoint,
  joinGeojsonLineStringArrayToGeojsonMultiLineString,
  joinGeojsonPolygonArrayToGeojsonMultiPolygon,
  joinGeojsonGeometryArrayToGeojsonMultiGeometry,
  geojsonToSvg,
  geometryToFeature,
  featuresToFeatureCollection,
  geometriesToFeatureCollection,
  featureToGeometry,
  featureCollectionToGeometries
} from './geojson.js'

export {
  isPoint,
  isLineString,
  isRing,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
  isGeometry,
  conformLineString,
  conformRing,
  conformPolygon,
  conformMultiLineString,
  conformMultiPolygon,
  pointToGeojsonPoint,
  lineStringToGeojsonLineString,
  ringToGeojsonPolygon,
  polygonToGeojsonPolygon,
  multiPointToGeojsonMultiPoint,
  multiLineStringToGeojsonMultiLineString,
  multiPolygonToGeojsonMultiPolygon,
  geometryToGeojsonGeometry,
  isClosed,
  isEqualPoint,
  isEqualPointArray,
  isEqualPointArrayArray,
  pointsAndPointsToLines,
  lineStringToLines,
  pointToPixel,
  pixelToIntArrayIndex,
  flipX,
  flipY,
  mixNumbers,
  mixPoints,
  midPoint,
  lineAngle,
  stepDistanceAngle,
  distance,
  squaredDistance,
  rms,
  triangleArea,
  invertPoint,
  invertPoints,
  scalePoint,
  scalePoints,
  translatePoint,
  translatePoints,
  rotatePoint,
  rotatePoints
} from './geometry.js'

export {
  degreesToRadians,
  isEqualArray,
  arrayRepeated,
  subSetArray,
  equalSet,
  maxOfNumberOrUndefined,
  isValidHttpUrl
} from './main.js'

export { getFullResourceMask } from './masks.js'

export { mergeOptions, mergePartialOptions } from './options.js'

export { lonLatToWebMecator, webMercatorToLonLat } from './projection.js'

export {
  stringToSvgGeometriesGenerator,
  svgGeometriesToSvgString,
  mapToResourceMaskSvgPolygon,
  svgToGeojson
} from './svg.js'

export {
  polygonSelfIntersectionPoints,
  linesIntersectionPoint,
  prolongedLinesIntersectionPoint
} from './self-intersect.js'
