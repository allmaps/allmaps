import {
  defaultGcpTransformOptions,
  defaultGcpTransformerOptions
} from '@allmaps/transform'

import type { Command, OptionValues } from '@commander-js/extra-typings'

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
  return addTransformationTypeOptions(
    command
      .option(
        '-g, --gcps <filename>',
        'Filename of GCP file. These GCPs take precedence over the GCPs from the Georeference Annotation'
      )
      .option(
        '-o, --polynomial-order <order>',
        'Order of polynomial transformation. Either 1, 2 or 3.',
        parseInt,
        1
      )
  )
}

export function addTransformationTypeOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return command.option(
    '-t, --transformation-type <type>',
    'Transformation type. One of "helmert", "polynomial", "thinPlateSpline", "projective". ' +
      'This takes precedence over the transformation type from the Georeference Annotation',
    'polynomial'
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
      `Maximum recursion depth when recursively adding midpoints (higher means more midpoints). Default ${defaultGcpTransformOptions.maxDepth} (i.e. no midpoints by default!).`,
      parseInt,
      defaultGcpTransformOptions.maxDepth
    )
    .option(
      '--min-offset-ratio <number>',
      `Minimum offset ratio when recursively adding midpoints (lower means more midpoints). Default ${defaultGcpTransformOptions.minOffsetRatio}.`,
      parseFloat,
      defaultGcpTransformOptions.minOffsetRatio
    )
    .option(
      '--min-offset-distance <number>',
      `Minimum offset distance when recursively adding midpoints (lower means more midpoints). Default ${defaultGcpTransformOptions.minOffsetDistance}.`,
      parseFloat,
      defaultGcpTransformOptions.minOffsetDistance
    )
    .option(
      '--min-line-distance <number>',
      `Minimum line distance when recursively adding midpoints (lower means more midpoints). Default ${defaultGcpTransformOptions.minLineDistance}.`,
      parseFloat,
      defaultGcpTransformOptions.minLineDistance
    )
    .option(
      '--geo-is-geographic',
      'Use geographic distances and midpoints for lon-lat geo points.',
      defaultGcpTransformOptions.geoIsGeographic
    )
}

export function addTransformerOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return command.option(
    '--different-handedness',
    'Whether one of the axes should be flipped (internally) while computing the transformation parameters. This will not alter the axis orientation of the output. Should be true if the handedness differs between the source and destination, and makes a difference for specific transformation types like the Helmert transform.',
    defaultGcpTransformerOptions.differentHandedness
  )
}

export function addInverseOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return command.option(
    '-i, --inverse',
    "Computes the inverse 'toResource' transformation",
    false
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

export function addAttachOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return command
    .option(
      '-r, --rcps <filename>',
      'Resource Control Points, used to infer the attachments'
    )
    .option(
      '--no-average-out',
      "Don't average out the resulting geo coordinates for each id. For inexact transformations (like 'polynomial') the geo coordinates will in general not be equal. This forces them be equal. For exact transformation types (like 'thinPlateSpline') the geo coordinates will be (quasi) identical making this averaging not (strictly) necessary. Note: the averaging happens in projected geo coordinates."
    )
    .option(
      '--use-map-transformation-types',
      "Let transformationType overrule the map's TransformationType."
    )
    .option(
      '--no-clone',
      "Don't clone the map and it's transformer and transformations before returning the results. This prevents from overriding object properties like GCPs on the input objects."
    )
    .option(
      '--no-evaluate-attachment-scps',
      "For both Source Control Points of an attachment, don't evaluate them using the solved attached transformation to create a GCP on the corresponding map."
    )
    .option(
      '--evaluate-single-scps',
      'For Source Control Points without a matching pair, evaluate them using the solved attached transformation and create a GCP on the corresponding map.'
    )
    .option(
      '--evaluate-gcps',
      'For existing GCPs, re-evaluate them using the solved attached transformation.'
    )
    .option('--remove-existing-gcps', 'Remove existing GCPs.')
}
