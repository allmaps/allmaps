import type { Command } from 'commander'

import type { OptionalTransformOptions } from '@allmaps/transform'

const DEFAULT_MAX_OFFSET_RATIO = 0
const DEFAULT_MAX_DEPTH = 6

export function addAnnotationOption(command: Command) {
  return command.requiredOption(
    '-a, --annotation <filename>',
    'Filename of Georeference Annotation'
  )
}

export function addTransformOptions(command: Command) {
  return command
    .option(
      '-p, --max-offset-ratio <number>',
      'Maximum offset ratio between original and transformed midpoints',
      `${DEFAULT_MAX_OFFSET_RATIO}`
    )
    .option(
      '-d, --max-depth <number>',
      'Maximum recursion depth',
      `${DEFAULT_MAX_DEPTH}`
    )
}

export function parseTransformOptions(options: any): OptionalTransformOptions {
  let transformOptions: OptionalTransformOptions = {}

  if (options && options.maxOffsetRatio) {
    transformOptions.maxOffsetRatio = parseFloat(
      options.maxOffsetRatio
    )
  }

  if (options && options.maxDepth) {
    transformOptions.maxDepth = parseInt(options.maxDepth)
  }

  return transformOptions
}
