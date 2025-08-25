import { Command, Option } from '@commander-js/extra-typings'

import fs from 'fs'
import path from 'path'

import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
import { generateId } from '@allmaps/id'
import {
  bboxToRectangle,
  bboxToSize,
  computeBbox,
  geometryToGeojsonGeometry,
  mergeOptionsUnlessUndefined,
  mergePartialOptions,
  rectanglesToScale
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
  parseProjectedGcpTransformerInputOptionsAndMap,
  mustContainGcpsMessage
} from '../../lib/parse.js'
import { getMapId } from '../../lib/map.js'
import {
  preamble,
  checkImageExistsAndCorrectSize,
  gdalwarp,
  gdalbuildvrt
} from '../../lib/gdal.js'

import type { Rectangle, Size } from '@allmaps/types'

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

      const geoMask = projectedTransformer.transformToGeo(map.resourceMask, {
        projection: lonLatProjection,
        maxDepth: 6
      })
      const geojsonMaskPolygon = geometryToGeojsonGeometry([geoMask])

      if (!map.resource.width || !map.resource.height) {
        throw new Error('Map size not specified')
      }
      const resourceFullMaskSize: Size = [
        map.resource.width,
        map.resource.height
      ]
      const resourceMaskBbox = computeBbox(map.resourceMask)
      const resourceMaskRectangle = bboxToRectangle(resourceMaskBbox)
      const projectedGeoMaskRectangle = projectedTransformer.transformToGeo(
        resourceMaskRectangle
      ) as Rectangle
      const resourceToProjectedGeoScale = rectanglesToScale(
        resourceMaskRectangle,
        projectedGeoMaskRectangle
      )

      const projectedGeoMask = projectedTransformer.transformToGeo(
        map.resourceMask
      )

      const projectedGeoMaskBboxSize: Size = bboxToSize(
        computeBbox(projectedGeoMask)
      )

      const size: Size = [
        Math.round(projectedGeoMaskBboxSize[0] * resourceToProjectedGeoScale),
        Math.round(projectedGeoMaskBboxSize[1] * resourceToProjectedGeoScale)
      ]

      const gdalwarpScript = gdalwarp(
        imageFilename,
        basename,
        options.outputDir,
        gcps.map(({ resource, geo }) => ({
          resource,
          geo: projectedTransformer.projectionToInternalProjection(
            projectedTransformer.lonLatToProjection(geo)
          )
        })),
        geojsonMaskPolygon,
        transformationType,
        projectedGcpTransformerOptions.internalProjection?.definition,
        projectedGcpTransformerOptions.projection?.definition,
        Number(options.jpgQuality),
        size
      )

      gdalwarpScripts.push(
        checkImageExistsAndCorrectSize(
          imageFilename,
          basename,
          resourceFullMaskSize
        ),
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
