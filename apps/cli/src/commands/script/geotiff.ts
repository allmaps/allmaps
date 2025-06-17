import { Command, Option } from '@commander-js/extra-typings'

import fs from 'fs'
import path from 'path'

import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
import { generateId } from '@allmaps/id'
import {
  geometryToGeojsonGeometry,
  mergeOptions,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'

import {
  addProjectedGcpTransformerInputOptions,
  addProjectedGcpTransformerOptions,
  addProjectedGcpTransformOptions
} from '../../lib/options.js'
import { parseJsonInput, printString } from '../../lib/io.js'
import {
  parseAnnotationsValidateMaps,
  parseProjectedGcpTransformOptions,
  parseProjectedGcpTransformerOptions,
  parseProjectedGcpTransformerInputOptionsAndMap
} from '../../lib/parse.js'
import { getMapId } from '../../lib/map.js'
import {
  preamble,
  checkImageExistsAndCorrectSize,
  gdalwarp,
  gdalbuildvrt
} from '../../lib/gdal.js'

export function geotiff() {
  const command = addProjectedGcpTransformerOptions(
    addProjectedGcpTransformOptions(
      addProjectedGcpTransformerInputOptions(
        new Command('geotiff')
          .argument('[files...]')
          .summary('generate a Bash script to create a Cloud Optimized GeoTIFF')
          .description(
            'Generates a Bash script that runs GDAL to create a Cloud Optimized GeoTIFF from one or more Georeference Annotations'
          )
          .option(
            '-s, --source-dir <dir>',
            'Directory containing source images',
            '.'
          )
          .option('-d, --output-dir <dir>', 'Output directory', '.')
          .option(
            '-q, --jpg-quality <number>',
            'JPG compression quality',
            parseInt,
            75
          )
          .addOption(
            new Option(
              '--image-filenames-file <filename>',
              'Path to a JSON file containing filenames of images to be used. See https://github.com/allmaps/allmaps/tree/develop/apps/cli#specifying-image-filenames for details'
            ).conflicts('source-dir')
          )
      )
    )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const maps = parseAnnotationsValidateMaps(jsonValues)
    const partialProjectedGcpTransformerOptions =
      parseProjectedGcpTransformerOptions(options)
    const partialProjectedGcpTransformOptions =
      parseProjectedGcpTransformOptions(options)

    const basenames: string[] = []
    const gdalwarpScripts: string[] = []

    let imageFilenames: { [key: string]: string } = {}

    if (options.imageFilenamesFile) {
      imageFilenames = JSON.parse(
        fs.readFileSync(options.imageFilenamesFile, 'utf-8')
      )
    }

    for (const map of maps) {
      const mapId = await getMapId(map)
      const imageId = await generateId(map.resource.id)

      const basename = `${imageId}_${mapId}`

      let imageFilename: string
      if (
        map.resource.id in imageFilenames &&
        typeof imageFilenames[map.resource.id] === 'string'
      ) {
        imageFilename = imageFilenames[map.resource.id]
      } else {
        imageFilename = path.join(options.sourceDir, `${imageId}.jpg`)
      }

      const { gcps, transformationType, internalProjection } =
        parseProjectedGcpTransformerInputOptionsAndMap(options, map)

      const projectedTransformer = new ProjectedGcpTransformer(
        gcps,
        transformationType,
        mergeOptionsUnlessUndefined(
          mergePartialOptions(
            partialProjectedGcpTransformerOptions,
            partialProjectedGcpTransformOptions
          ),
          { internalProjection }
        )
      )

      const geoPolygon = projectedTransformer.transformToGeo(
        [map.resourceMask],
        mergeOptions(partialProjectedGcpTransformOptions, {
          projection: lonLatProjection
        })
      )
      const geojsonPolygon = geometryToGeojsonGeometry(geoPolygon)

      const gdalwarpScript = gdalwarp(
        imageFilename,
        basename,
        options.outputDir,
        gcps, // TODO: check if these should be projected?
        geojsonPolygon,
        transformationType,
        partialProjectedGcpTransformOptions.projection?.definition ??
          'EPSG:3857', // TODO: check if this should be projection of internal projection
        Number(options.jpgQuality)
      )

      gdalwarpScripts.push(
        checkImageExistsAndCorrectSize(imageFilename, basename, map),
        gdalwarpScript
      )

      basenames.push(basename)
    }

    const outputVrt =
      basenames.length > 1 ? 'merged.vrt' : `${basenames[0]}.vrt`

    const inputTiffs = basenames.map((basename) => `${basename}-warped.tif`)
    const gdalbuildvrtScript = gdalbuildvrt(
      options.outputDir,
      inputTiffs,
      outputVrt
    )

    const gdalScripts = [
      preamble(options.outputDir),
      '',
      ...gdalwarpScripts,
      '',
      gdalbuildvrtScript
    ]

    printString(gdalScripts.join('\n'))
  })
}
