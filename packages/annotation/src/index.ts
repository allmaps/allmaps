import { z } from 'zod'

/**
 * Object that contains the data needed to georeference a IIIF map. For details, see its [JSON Schema](schemas/map.json) or the [example](examples/map.example.json) in the `examples` directory.
 * @typedef {Object} Map
 */

/**
 * [Web Annotation](https://www.w3.org/TR/annotation-model/) that contains a single georeference annotation or an [Annotation Page](https://www.w3.org/TR/annotation-model/#annotation-page) with georeference annotation. For details, see its [JSON Schema](schemas/annotation.json) or the [example](examples/annotation.example.json) in the `examples` directory.
 * @typedef {Object} Annotation
 */

export * from './parser.js'
export * from './generator.js'
export * from './validator.js'

import { AnnotationSchema, AnnotationPageSchema } from './schemas/annotation.js'

import { MapSchema, MapsSchema } from './schemas/map.js'

export type Annotation = z.infer<typeof AnnotationSchema>
export type AnnotationPage = z.infer<typeof AnnotationPageSchema>

export type Map = z.infer<typeof MapSchema>
export type Maps = z.infer<typeof MapsSchema>
