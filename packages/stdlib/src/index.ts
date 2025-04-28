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
  intersectBboxes,
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
  getPropertyFromDoubleCacheOrComputation,
  getPropertyFromTrippleCacheOrComputation
} from './cache.js'

export {
  rgbToHex,
  rgbaToHex,
  hexToRgb,
  hexToRgba,
  hexToOpaqueRgba,
  hexToFractionalRgb,
  hexToFractionalRgba,
  hexToFractionalOpaqueRgba
} from './color.js'

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
  isGeojsonMultiGeometry,
  geojsonPointToPoint,
  geojsonLineStringToLineString,
  geojsonPolygonToRing,
  geojsonPolygonToPolygon,
  geojsonMultiPointToMultiPoint,
  geojsonMultiLineStringToMultiLineString,
  geojsonMultiPolygonToMultiPolygon,
  geojsonGeometryToGeometry,
  geojsonGeometryToSvgGeometry,
  geojsonGeometryToGeojsonFeature,
  geojsonFeaturesToGeojsonFeatureCollection,
  geojsonGeometriesToGeojsonFeatureCollection,
  geojsonFeatureToGeojsonGeometry,
  geojsonFeatureCollectionToGeojsonGeometries,
  expandGeojsonMultiPointToGeojsonPoints,
  expandGeojsonMultiLineStringToGeojsonLineStrings,
  expandGeojsonMultiPolygonToGeojsonPolygons,
  expandGeojsonMultiGeometryToGeojsonGeometries,
  contractGeojsonPointsToGeojsonMultiPoint,
  contractGeojsonLineStringsToGeojsonMultiLineString,
  contractGeojsonPolygonsToGeojsonMultiPolygon,
  contractGeojsonGeometriesToGeojsonMultiGeometry,
  mergeGeojsonFeaturesCollections
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
  closeRing,
  uncloseRing,
  closePolygon,
  unclosePolygon,
  closeMultiPolygon,
  uncloseMultiPolygon,
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
  geometryToSvgGeometry,
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
  rotatePoints,
  triangleAngles,
  threePointsToAngle
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

export {
  mergeOptions,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from './options.js'

export {
  isSvgCircle,
  isSvgLine,
  isSvgPolyLine,
  isSvgRect,
  isSvgPolygon,
  stringToSvgGeometriesGenerator,
  svgGeometriesToSvgString,
  svgGeometryToString,
  mapToResourceMaskSvgPolygon,
  svgGeometryToGeometry
} from './svg.js'

export {
  polygonSelfIntersectionPoints,
  linesIntersectionPoint,
  prolongedLinesIntersectionPoint
} from './self-intersect.js'
