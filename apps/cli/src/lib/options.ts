import { defaultProjectedGcpTransformOptions } from '@allmaps/project'

import type { Command, OptionValues } from '@commander-js/extra-typings'

export function addAnnotationOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  // Note: annotation is not required since transformer can be built using only GCPs, which could be specified individually.
  // This is especially useful when transforming coordinates, outside of the Allmaps context.
  // An error message is still displayed when neither an annotation or GCPs are specified
  return addProjectedGcpTransformerInputOptions(
    command.option(
      '-a, --annotation <filename>',
      'Filename of Georeference Annotation (or Georeferenced Map)'
    )
  )
}

export function addProjectedGcpTransformerInputOptions<
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
      'Transformation type. One of "polynomial", "thinPlateSpline", "linear", "helmert", "projective". ' +
        'This takes precedence over the transformation type from the Georeference Annotation',
      'polynomial'
    )
    .option(
      '-o, --polynomial-order <order>',
      'Order of polynomial transformation. Either 1, 2 or 3.',
      parseInt,
      1
    )
    .option(
      '--internal-projection <proj4string>',
      `The geographic projection used internally in the transformation.`,
      'EPSG:3857'
    )
}

export function addProjectedGcpTransformOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return command
    .option(
      '-m, --max-depth <number>',
      `Maximum recursion depth when recursively adding midpoints (higher means more midpoints). Default ${defaultProjectedGcpTransformOptions.maxDepth}, so no midpoints by default!`,
      parseInt
    )
    .option(
      '--min-offset-ratio <number>',
      `Minimum offset ratio when recursively adding midpoints (lower means more midpoints). Default ${defaultProjectedGcpTransformOptions.minOffsetRatio}.`,
      parseFloat
    )
    .option(
      '--min-offset-distance <number>',
      `Minimum offset distance when recursively adding midpoints (lower means more midpoints). Default 'Infinity'.`,
      parseFloat
    )
    .option(
      '--min-line-distance <number>',
      `Minimum line distance when recursively adding midpoints (lower means more midpoints). Default 'Infinity'.`,
      parseFloat
    )
    .option(
      '--geo-is-geographic',
      `Use geographic distances and midpoints for lon-lat geo points.`
    )
    .option(
      '--projection <proj4string>',
      `The geographic projection rendered in the viewport.`,
      'EPSG:3857'
    )
}

export function addProjectedGcpTransformerOptions<
  Args extends unknown[] = [],
  Opts extends OptionValues = Record<string, unknown>,
  GlobalOpts extends OptionValues = Record<string, unknown>
>(command: Command<Args, Opts, GlobalOpts>) {
  return command.option(
    '--no-different-handedness',
    `Don't flip one of the axes (internally) while computing the transformation parameters. Should be set if the handedness doesn't differ between the resource and geo coordinate spaces. Makes a difference for specific transformation types like the Helmert transform. (Flipping is internal and will not alter the axis orientation of the output.)`
  )

  // Note: Internal Projection is added in addProjectedGcpTransformerInputOptions()
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
