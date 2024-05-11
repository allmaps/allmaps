import { z } from 'zod'

// TODO: add  "For details, see its [JSON Schema](schemas/annotation.json) or the [example](examples/annotation.example.json) in the `examples` directory."

/**
 * [Web Annotation](https://www.w3.org/TR/annotation-model/) that contains a single [Georeference Annotation](https://iiif.io/api/extension/georef/).
 * @typedef {Object} Annotation
 */

/**
 * An [Annotation Page](https://www.w3.org/TR/annotation-model/#annotation-page) that contains multiple [Georeference Annotations](https://iiif.io/api/extension/georef/).
 * @typedef {Object} AnnotationPage
 */

/**
 * Object that contains the data needed to georeference a IIIF resource in the format that is used by Allmaps internally.
 * @typedef {Object} Map
 */

export { parseAnnotation } from './parser.js'
export { generateAnnotation } from './generator.js'
export { validateAnnotation, validateMap } from './validator.js'

import { AnnotationSchema, AnnotationPageSchema } from './schemas/annotation.js'

import { MapSchema } from './schemas/map.js'

export type Annotation = z.infer<typeof AnnotationSchema>
export type AnnotationPage = z.infer<typeof AnnotationPageSchema>

export type Map = z.infer<typeof MapSchema>

export { MapSchema, AnnotationSchema, AnnotationPageSchema }
