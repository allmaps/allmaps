import type { Command } from 'commander'

import type { OptionalTransformOptions } from '@allmaps/transform'

const DEFAULT_MAX_OFFSET_PERCENTAGE = 0
const DEFAULT_MAX_DEPTH = 0

export function addAnnotationOption(command: Command) {
  return command.requiredOption(
    '-a, --annotation <filename>',
    'Filename of Georeference Annotation'
  )
}

export function addTransformOptions(command: Command) {
  return command
    .option(
      '-p, --max-offset-percentage <number>',
      '',
      `${DEFAULT_MAX_OFFSET_PERCENTAGE}`
    )
    .option(
      '-d, --max-depth <number>',
      'Maximum recursion depth',
      `${DEFAULT_MAX_DEPTH}`
    )
}

export function parseTransformOptions(options: any): OptionalTransformOptions {
  let transformOptions: OptionalTransformOptions = {}

  if (options && options.maxOffsetPercentage) {
    transformOptions.maxOffsetPercentage = parseFloat(
      options.maxOffsetPercentage
    )
  }

  if (options && options.maxDepth) {
    transformOptions.maxDepth = parseInt(options.maxDepth)
  }

  return transformOptions
}
