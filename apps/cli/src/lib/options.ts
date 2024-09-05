import type { Command } from 'commander'

const DEFAULT_MAX_OFFSET_RATIO = 0
const DEFAULT_MAX_DEPTH = 0

export function addAnnotationOptions(command: Command): Command {
  // Note: annotation is not required since transformer can be built using only GCPs, which could be specified individually.
  // This is especially useful when transforming coordinates, outside of the Allmaps context.
  // An error message is still displayed when neither an annotation or GCPs are specified
  return addTransformationOptions(command)
    .option(
      '-a, --annotation <filename>',
      'Filename of Georeference Annotation'
    )
    .option('-i, --inverse', 'Computes the inverse/backward transformation')
}

export function addTransformationOptions(command: Command) {
  return command
    .option(
      '-g, --gcps <filename>',
      'Filename of GCP file. These GCPs take precedence over the GCPs from the Georeference Annotation'
    )
    .option(
      '-t, --transformation-type <type>',
      'Transformation type. One of "helmert", "polynomial", "thinPlateSpline", "projective". ' +
        'This takes precedence over the transformation type from the Georeference Annotation',
      'polynomial'
    )
    .option(
      '-o, --polynomial-order <order>',
      'Order of polynomial transformation. Either 1, 2 or 3.',
      '1'
    )
}

export function addTransformOptions(command: Command) {
  return command
    .option(
      '-p, --max-offset-ratio <number>',
      // TODO: needs better description
      'Maximum offset ratio between original and transformed midpoints',
      `${DEFAULT_MAX_OFFSET_RATIO}`
    )
    .option(
      '-d, --max-depth <number>',
      'Maximum recursion depth',
      `${DEFAULT_MAX_DEPTH}`
    )
}

export function addCoordinateTransformOptions(command: Command) {
  return addTransformOptions(command)
    .option('--destination-is-geographic', 'Destination is geographic')
    .option('--source-is-geographic', 'Source is geographic')
}

export function addParseIiifOptions(command: Command) {
  return command
    .option(
      '-c, --fetch-collections',
      'Recursively fetches and parses embedded IIIF Collections',
      false
    )
    .option(
      '-m, --fetch-manifests',
      'Recursively fetches and parses embedded IIIF Manifests',
      false
    )
    .option(
      '-i, --fetch-images',
      'Recursively fetches and parses embedded IIIF Images',
      false
    )
    .option(
      '-a, --fetch-all',
      'Recursively fetches and parses embedded IIIF Collections, Manifests and Images',
      false
    )
}
