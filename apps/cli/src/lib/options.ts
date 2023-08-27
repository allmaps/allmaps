import type { Command } from 'commander'

const DEFAULT_MAX_OFFSET_RATIO = 0
const DEFAULT_MAX_DEPTH = 6

export function addAnnotationOptions(command: Command): Command {
  // Note: annotation is not required since transformer can be built using only gcps, which could be specified individually. This is especially useful when transforming positions, outside of the allmaps annotation context. An error message is still displayed when neither an annotation or gcps are specified
  return command
    .option(
      '-a, --annotation <filename>',
      'Filename of Georeference Annotation'
    )
    .option(
      '-a, --annotation <filename>',
      'Filename of Georeference Annotation'
    )
    .option('-i, --inverse', 'Compute backward ("inverse") transformation.')
    .option(
      '-g, --gcps <filename>',
      'Filename of GCPs. This overwrites the GCPs in the annotation argument if such is also used.'
    )
    .option(
      '-t, --transformationType <transformationType>',
      'Transformation Type. One of "helmert", "polynomial", "thinPlateSpline", "projective". This overwrites the transformation type in the annotation argument if such is also used.',
      'polynomial'
    )
    .option(
      '-o, --transformationOrder <transformationOrder>',
      'Order of polynomial transformation. One of "1", "2" or "3".',
      '1'
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
