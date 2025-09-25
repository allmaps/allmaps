import { Command } from '@commander-js/extra-typings'
import path from 'path'

import { generateId } from '@allmaps/id'
import { generateCheckCommand } from '@allmaps/io'

import { readLines, printString } from '../../lib/io.js'

const dezoomifyNotFoundMessage = 'Please install dezoomify-rs'

function preamble(outputDir: string) {
  return `#!/usr/bin/env bash

mkdir -p ${outputDir}

${generateCheckCommand('dezoomify-rs', dezoomifyNotFoundMessage)}
`.trim()
}

export function dezoomify() {
  return new Command('dezoomify')
    .argument('[files...]')
    .summary('generate a Bash script to create Cloud Optimized GeoTIFFs')
    .description(
      'Generates a Bash script that runs GDAL to create Cloud Optimized GeoTIFFs from one of more Georeference Annotations'
    )
    .option('-d, --output-dir <dir>', 'Output directory', '.')
    .action(async (imageIds, options) => {
      const outputDir = options.outputDir

      imageIds = await readLines(imageIds)

      const dezoomifyScripts: string[] = []

      let index = 0
      for (const imageId of imageIds) {
        const outputFilename = path.join(
          outputDir,
          `${await generateId(imageId)}.jpg`
        )

        const dezoomifyMessage = `echo "Downloading ${imageId} (${index + 1}/${
          imageIds.length
        })"`
        const dezoomifyScript = `dezoomify-rs --largest --retries 5 --retry-delay 5s "${imageId}/info.json" ${outputFilename}`
        dezoomifyScripts.push(dezoomifyMessage, dezoomifyScript)

        index++
      }

      printString(
        [preamble(options.outputDir), '', ...dezoomifyScripts].join('\n')
      )
    })
}
