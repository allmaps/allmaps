import { Command, Option } from '@commander-js/extra-typings'

import { ProjectedGcpTransformer } from '@allmaps/project'
import {
  mergeOptions,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'
import { getGeoreferencedMapsGeotiffScripts } from '@allmaps/io'

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

    // Create projected transformers from options rather then from maps,
    // since options can overwrite map properties
    // TODO: consider adding possibility to override map options like resourceMask, height, ...
    const projectedTransformers: ProjectedGcpTransformer[] = []
    for (const map of maps) {
      const { gcps, transformationType, internalProjection, projection } =
        parseProjectedGcpTransformerInputOptionsAndMap(options, map)

      const projectedGcpTransformerOptions = mergeOptionsUnlessUndefined(
        mergePartialOptions(
          partialProjectedGcpTransformerOptions,
          partialProjectedGcpTransformOptions
        ),
        { internalProjection, projection }
      )

      if (gcps === undefined) {
        throw new Error(mustContainGcpsMessage)
      }

      const projectedTransformer = new ProjectedGcpTransformer(
        gcps,
        transformationType,
        projectedGcpTransformerOptions
      )

      projectedTransformers.push(projectedTransformer)
    }

    const geotiffScripts = await getGeoreferencedMapsGeotiffScripts(
      maps,
      mergeOptions(options, { projectedTransformers })
    )

    printString(geotiffScripts.join('\n'))
  })
}
