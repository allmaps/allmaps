import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
import { generateChecksum, generateId } from '@allmaps/id'

import {
  bboxToRectangle,
  bboxToSize,
  computeBbox,
  geometryToGeojsonGeometry,
  mergeOptions,
  mergeOptionsUnlessUndefined,
  rectanglesToScale
} from '@allmaps/stdlib'
import { generateCheckCommand } from './bash.js'

import type { GeojsonPolygon, Gcp, Size, Rectangle } from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'
import type { GeoreferencedMap } from '@allmaps/annotation'

const jqNotFoundMessage = 'Please install jq: https://jqlang.github.io/jq/.'
const gdalNotFoundMessage = 'Please install GDAL.'

function pathJoin(...parts: string[]) {
  // In order for this script to be used in the browser,
  // we cannot use import { join } from 'path'
  const sep = '/'
  return parts.join(sep).replace(new RegExp(sep + '{1,}', 'g'), sep)
}

export async function generateGeoreferencedMapsGeotiffScripts(
  maps: GeoreferencedMap[],
  options?: Partial<{
    projectedTransformers: ProjectedGcpTransformer[]
    imageFilenames: { [key: string]: string }
    sourceDir: string
    outputDir: string
    jpgQuality: number
  }>
): Promise<string> {
  if (!options) {
    options = {}
  }

  const basenames: string[] = []
  const gdalwarpScripts: string[] = []

  for (const [index, map] of maps.entries()) {
    const projectedTransformer = options.projectedTransformers
      ? options.projectedTransformers[index]
      : undefined
    const { basename, checkScript, gdalWarpScript } =
      await generateGeoreferencedMapGdalwarpScripts(
        map,
        mergeOptionsUnlessUndefined(options, { projectedTransformer })
      )

    basenames.push(basename)
    gdalwarpScripts.push(checkScript, gdalWarpScript)
  }

  const gdalbuildvrtScript = generateGdalbuildvrtScript(basenames, options)

  const gdalScripts = [
    generateGdalPreamble(options),
    '',
    ...gdalwarpScripts,
    '',
    gdalbuildvrtScript
  ]

  return gdalScripts.join('\n')
}

export function generateGdalPreamble(options: Partial<{ outputDir: string }>) {
  const mergedOptions = mergeOptions({ outputDir: '.' }, options)

  return `#!/usr/bin/env bash

mkdir -p ${mergedOptions.outputDir}

${generateCheckCommand('gdalinfo', gdalNotFoundMessage)}
${generateCheckCommand('gdalbuildvrt', gdalNotFoundMessage)}
${generateCheckCommand('gdal_translate', gdalNotFoundMessage)}
${generateCheckCommand('gdalwarp', gdalNotFoundMessage)}
${generateCheckCommand('jq', jqNotFoundMessage)}`.trim()
}

export async function generateGeoreferencedMapGdalwarpScripts(
  map: GeoreferencedMap,
  options: Partial<{
    projectedTransformer: ProjectedGcpTransformer
    imageFilenames: { [key: string]: string }
    sourceDir: string
    outputDir: string
    jpgQuality: number
  }>
): Promise<{ basename: string; checkScript: string; gdalWarpScript: string }> {
  const defaultOptions = {
    projectedTransformer: ProjectedGcpTransformer.fromGeoreferencedMap(map),
    imageFilenames: {},
    sourceDir: '.',
    outputDir: '.',
    jpgQuality: 75
  }
  const mergedOptions = mergeOptions(defaultOptions, options)

  const mapId = await getMapId(map)
  const imageId = await generateId(map.resource.id)
  const basename = `${imageId}_${mapId}`

  let imageFilename: string
  if (
    map.resource.id in mergedOptions.imageFilenames &&
    typeof mergedOptions.imageFilenames[map.resource.id] === 'string'
  ) {
    imageFilename = mergedOptions.imageFilenames[map.resource.id]
  } else {
    imageFilename = pathJoin(mergedOptions.sourceDir, `${imageId}.jpg`)
  }

  const geoMask = mergedOptions.projectedTransformer.transformToGeo(
    map.resourceMask,
    {
      projection: lonLatProjection,
      maxDepth: 6
    }
  )
  const geojsonMaskPolygon = geometryToGeojsonGeometry([geoMask])

  if (!map.resource.width || !map.resource.height) {
    throw new Error('Map size not specified')
  }
  const resourceFullMaskSize: Size = [map.resource.width, map.resource.height]
  const resourceMaskBbox = computeBbox(map.resourceMask)
  const resourceMaskRectangle = bboxToRectangle(resourceMaskBbox)
  const projectedGeoMaskRectangle =
    mergedOptions.projectedTransformer.transformToGeo(
      resourceMaskRectangle
    ) as Rectangle
  const resourceToProjectedGeoScale = rectanglesToScale(
    resourceMaskRectangle,
    projectedGeoMaskRectangle
  )

  const projectedGeoMask = mergedOptions.projectedTransformer.transformToGeo(
    map.resourceMask
  )

  const projectedGeoMaskBboxSize: Size = bboxToSize(
    computeBbox(projectedGeoMask)
  )

  const size: Size = [
    Math.round(projectedGeoMaskBboxSize[0] * resourceToProjectedGeoScale),
    Math.round(projectedGeoMaskBboxSize[1] * resourceToProjectedGeoScale)
  ]

  return {
    basename,
    checkScript: generateCheckImageExistsAndCorrectSize(
      imageFilename,
      basename,
      resourceFullMaskSize
    ),
    gdalWarpScript: generateGdalwarpScriptInternal(
      imageFilename,
      basename,
      mergedOptions.outputDir,
      mergedOptions.projectedTransformer.interalProjectedGcps,
      mergedOptions.projectedTransformer.type,
      String(mergedOptions.projectedTransformer.internalProjection.definition),
      String(mergedOptions.projectedTransformer.projection.definition),
      mergedOptions.jpgQuality,
      geojsonMaskPolygon,
      size
    )
  }
}

export function generateGdalbuildvrtScript(
  basenames: string[],
  options: Partial<{ outputDir: string }>
) {
  const mergedOptions = mergeOptions({ outputDir: '.' }, options)

  const outputVrt = basenames.length > 1 ? 'merged.vrt' : `${basenames[0]}.vrt`
  const inputTiffs = basenames.map((basename) => `${basename}-warped.tif`)

  const vrtFilename = pathJoin(mergedOptions.outputDir, outputVrt)

  return `
gdalbuildvrt ${vrtFilename} \\
  ${inputTiffs.map((tiff) => pathJoin(mergedOptions.outputDir, tiff)).join(' ')}`.trim()
}

// TODO: consider adding gdal2tiles export:
//   gdal2tiles.py --xyz merged.vrt merged

// TODO: consider adding pmtiles export:
//    gdal_translate -of MBTILES merged.vrt merged.mbtiles
//    pmtiles convert merged.mbtiles merged.pmtiles

function generateCheckImageExistsAndCorrectSize(
  imageFilename: string,
  basename: string,
  resourceSize: Size
) {
  return `
if ! [ -f ${imageFilename} ]; then
  echo "Image file does not exist: ${imageFilename}"
  echo "This script expects a full-size source images for each georeferenced map it processes. See the README for more information."
  exit 1
fi

required_width_${basename}=${resourceSize[0]}
required_height_${basename}=${resourceSize[1]}

width_${basename}=( $(gdalinfo -json ${imageFilename} | jq '.size[0]') )
height_${basename}=( $(gdalinfo -json ${imageFilename} | jq '.size[1]') )

if [ "$width_${basename}" -eq "$required_width_${basename}" ] &&
   [ "$height_${basename}" -eq "$required_height_${basename}" ]; then
    echo "Found image with correct size: ${imageFilename}"
else
    echo "Error: found image with incorrect size"
    echo "  Image: ${imageFilename}"
    echo "  Expected: $required_width_${basename} x $required_height_${basename}"
    echo "  Found: $width_${basename} x $height_${basename}"
    exit 1
fi`.trim()
}

function generateGdalwarpScriptInternal(
  imageFilename: string,
  basename: string,
  outputDir: string,
  internalProjectedGcps: Gcp[],
  transformationType: TransformationType,
  internalProjectionDefinition: string,
  projectionDefinition: string,
  jpgQuality: number,
  geojsonMaskPolygon: GeojsonPolygon,
  size: Size
) {
  // See also: https://blog.cleverelephant.ca/2015/02/geotiff-compression-for-dummies.html

  // Set transformation options
  // See https://gdal.org/programs/gdalwarp.html#cmdoption-gdalwarp-tps
  let transformationArguments = '-order 1'
  let transformationMessage = ''

  if (
    transformationType === 'polynomial' ||
    transformationType === 'polynomial1' ||
    transformationType === 'polynomial2' ||
    transformationType === 'polynomial3'
  ) {
    if (transformationType === 'polynomial2') {
      transformationArguments = `-order 2`
    } else if (transformationType === 'polynomial3') {
      transformationArguments = `-order 3`
    }
  } else if (transformationType === 'thinPlateSpline') {
    transformationArguments = '-tps'
  } else if (transformationType) {
    transformationMessage = `Transformation type "${transformationType}" is not supported. Using default polynomial transformation while warping. Note that the mask is still processed with transformation type "${transformationType}". This can be undone using "-t polynomial".`
  }

  const vrtFilename = pathJoin(outputDir, `${basename}.vrt`)
  const geojsonFilename = pathJoin(outputDir, `${basename}.geojson`)
  const geotiffFilename = pathJoin(outputDir, `${basename}-warped.tif`)

  const script =
    `${transformationMessage ? `echo "${transformationMessage}"` : ''}

gdal_translate -of vrt \\
  -a_srs '${internalProjectionDefinition}' \\
  ${internalProjectedGcps
    .map((gcp) => `-gcp ${gcp.resource.join(' ')} ${gcp.geo.join(' ')}`)
    .join(' \\\n')} \\
  ${imageFilename} \\
  ${vrtFilename}

echo '${JSON.stringify(geojsonMaskPolygon)}' > ${geojsonFilename}

gdalwarp \\
  -of COG -co COMPRESS=JPEG -co QUALITY=${jpgQuality} \\
  -dstalpha -overwrite \\
  -r cubic \\
  -cutline ${geojsonFilename} -crop_to_cutline -cutline_srs "EPSG:4326" \\
  -s_srs '${internalProjectionDefinition}' \\
  -t_srs '${projectionDefinition}' \\
  -ts ${size[0]} ${size[1]} \\
  ${transformationArguments} \\
  ${vrtFilename} \\
  ${geotiffFilename}`.trim()

  return script
}

async function getMapId(map: GeoreferencedMap) {
  if (map.id) {
    const match = /maps\/(?<mapId>\w+)$/.exec(map.id)

    if (match) {
      const { groups: { mapId } = {} } = match
      return mapId
    }
  }

  const checksum = await generateChecksum(map)
  return checksum
}
