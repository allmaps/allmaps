import path from 'path'

import { checkCommand } from './bash.js'

import type { GeojsonPolygon, Gcp, Size } from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'

const jqNotFoundMessage = 'Please install jq: https://jqlang.github.io/jq/.'
const gdalNotFoundMessage = 'Please install GDAL.'

export function preamble(outputDir: string) {
  return `#!/usr/bin/env bash

mkdir -p ${outputDir}

${checkCommand('gdalinfo', gdalNotFoundMessage)}
${checkCommand('gdalbuildvrt', gdalNotFoundMessage)}
${checkCommand('gdal_translate', gdalNotFoundMessage)}
${checkCommand('gdalwarp', gdalNotFoundMessage)}
${checkCommand('jq', jqNotFoundMessage)}`.trim()
}

export function checkImageExistsAndCorrectSize(
  imageFilename: string,
  basename: string,
  resourceSize: Size
) {
  return `
if ! [ -f "${imageFilename}" ]; then
  echo "Image file does not exist: ${imageFilename}"
  echo "This script expects a full-size source images for each georeferenced map it processes. See the README for more information."
  exit 1
fi

required_width_${basename}=${resourceSize[0]}
required_height_${basename}=${resourceSize[1]}

width_${basename}=( $(gdalinfo -json "${imageFilename}" | jq '.size[0]') )
height_${basename}=( $(gdalinfo -json  "${imageFilename}" | jq '.size[1]') )

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

export function gdalwarp(
  imageFilename: string,
  basename: string,
  outputDir: string,
  internalProjectedGcps: Gcp[],
  geojsonMaskPolygon: GeojsonPolygon,
  transformationType: TransformationType,
  internalProjectionDefinition: string = 'EPSG:3857',
  projectionDefinition: string = 'EPSG:3857',
  jpgQuality: number,
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
    transformationMessage = `Transformation type "${transformationType}" is not supported. Using default transformation.`
  }

  const vrtFilename = path.join(outputDir, `${basename}.vrt`)
  const geojsonFilename = path.join(outputDir, `${basename}.geojson`)
  const geotiffFilename = path.join(outputDir, `${basename}-warped.tif`)

  return `${transformationMessage ? `echo "${transformationMessage}"` : ''}

gdal_translate -of vrt \\
  -a_srs "${internalProjectionDefinition}" \\
  ${internalProjectedGcps
    .map((gcp) => `-gcp ${gcp.resource.join(' ')} ${gcp.geo.join(' ')}`)
    .join(' \\\n')} \\
  "${imageFilename}" \\
  "${vrtFilename}"

echo '${JSON.stringify(geojsonMaskPolygon)}' > "${geojsonFilename}"

gdalwarp \\
  -of COG -co COMPRESS=JPEG -co QUALITY=${jpgQuality} \\
  -dstalpha -overwrite \\
  -r cubic \\
  -cutline "${geojsonFilename}" -crop_to_cutline -cutline_srs "EPSG:4326" \\
  -s_srs "${internalProjectionDefinition}" \\
  -t_srs "${projectionDefinition}" \\
  -ts ${size[0]} ${size[1]} \\
  ${transformationArguments} \\
  "${vrtFilename}" \\
  "${geotiffFilename}"`.trim()
}

export function gdalbuildvrt(
  outputDir: string,
  inputTiffs: string[],
  outputVrt: string
) {
  const vrtFilename = path.join(outputDir, outputVrt)

  return `
gdalbuildvrt "${vrtFilename}" \\
  ${inputTiffs.map((tiff) => path.join(outputDir, tiff)).join(' ')}`.trim()
}

// TODO: consider adding gdal2tiles export:
//   gdal2tiles.py --xyz merged.vrt merged

// TODO: consider adding pmtiles export:
//    gdal_translate -of MBTILES merged.vrt merged.mbtiles
//    pmtiles convert merged.mbtiles merged.pmtiles
