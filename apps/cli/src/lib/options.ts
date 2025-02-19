import type { Command, OptionValues } from '@commander-js/extra-typings'

const DEFAULT_MIN_OFFSET_RATIO = 0
const DEFAULT_MAX_DEPTH = 0

export function addAnnotationOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  // Note: annotation is not required since transformer can be built using only GCPs, which could be specified individually.
  // This is especially useful when transforming coordinates, outside of the Allmaps context.
  // An error message is still displayed when neither an annotation or GCPs are specified
  return addTransformationOptions(
    command.option(
      '-a, --annotation <filename>',
      'Filename of Georeference Annotation'
    )
  )
}

export function addTransformationOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
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
      parseInt,
      1
    )
}

export function addTransformOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return command
    .option(
      '-m, --max-depth <number>',
      `Maximum recursion depth when recursively adding midpoints (higher means more midpoints). Default ${DEFAULT_MAX_DEPTH} (i.e. no midpoints by default!).`,
      parseInt,
      DEFAULT_MAX_DEPTH
    )
    .option(
      '-p, --min-offset-ratio <number>',
      // TODO: needs better description
      `Minimum offset ratio when recursively adding midpoints (lower means more midpoints). Default ${DEFAULT_MIN_OFFSET_RATIO}.`,
      parseFloat,
      DEFAULT_MIN_OFFSET_RATIO
    )
}

export function addCoordinateTransformOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return addTransformOptions(
    command
      .option('--destination-is-geographic', 'Destination is geographic')
      .option('--source-is-geographic', 'Source is geographic')
      .option('-i, --inverse', 'Computes the inverse/backward transformation')
  )
}

export function addParseIiifOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
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
    .option(
      '-f, --fetch-max-depth <number>',
      'Maximum recursion depth for fetching IIIF resources',
      parseInt
    )
}
