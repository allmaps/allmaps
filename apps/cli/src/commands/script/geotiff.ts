import { Command, Option } from '@commander-js/extra-typings'

import fs from 'fs'
import path from 'path'

import { ProjectedGcpTransformer } from '@allmaps/project'
import { generateId } from '@allmaps/id'
import {
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'
import {
  getGdalbuildvrtScript,
  getGeoreferencedMapGdalwarpScripts,
  getGdalPreamble
} from '@allmaps/io'

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
  parseProjectedGcpTransformerInputOptionsAndMap,
  mustContainGcpsMessage
} from '../../lib/parse.js'
import { getMapId } from '../../lib/map.js'

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
      ),
      { projectionDefinition: 'EPSG:3857' } // Note: different default projection for geotiff!
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

      const projectedGcpTransformerOptions = mergeOptionsUnlessUndefined(
        mergePartialOptions(
          partialProjectedGcpTransformerOptions,
          partialProjectedGcpTransformOptions
        ),
        { internalProjection }
      )

      if (gcps === undefined) {
        throw new Error(mustContainGcpsMessage)
      }

      const projectedTransformer = new ProjectedGcpTransformer(
        gcps,
        transformationType,
        projectedGcpTransformerOptions
      )

      gdalwarpScripts.push(
        ...getGeoreferencedMapGdalwarpScripts(
          map,
          projectedTransformer,
          imageFilename,
          basename,
          options.outputDir,
          Number(options.jpgQuality)
        )
      )

      basenames.push(basename)
    }

    const outputVrt =
      basenames.length > 1 ? 'merged.vrt' : `${basenames[0]}.vrt`
    const inputTiffs = basenames.map((basename) => `${basename}-warped.tif`)
    const gdalbuildvrtScript = getGdalbuildvrtScript(
      options.outputDir,
      inputTiffs,
      outputVrt
    )

    const gdalScripts = [
      getGdalPreamble(options.outputDir),
      '',
      ...gdalwarpScripts,
      '',
      gdalbuildvrtScript
    ]

    printString(gdalScripts.join('\n'))
  })
}
