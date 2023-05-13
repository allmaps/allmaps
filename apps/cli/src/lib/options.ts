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

export function parseTransformOptions(
  options: unknown
): OptionalTransformOptions {
  const transformOptions: OptionalTransformOptions = {}

  if (options && typeof options === 'object') {
    if ('maxOffsetRatio' in options && options.maxOffsetRatio) {
      transformOptions.maxOffsetRatio = Number(options.maxOffsetRatio)
    }

    if ('maxDepth' in options && options.maxDepth) {
      transformOptions.maxDepth = Math.round(Number(options.maxDepth))
    }
  }

  return transformOptions
}
