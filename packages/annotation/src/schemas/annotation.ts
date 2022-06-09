import { z } from 'zod'

import { PointSchema, ImageServiceSchema } from './shared.js'

const svg =
  /^<svg\s+width="\d+"\s+height="\d+"\s*>\s*<polygon\s+points="(\d+,\d+\s+){2,}\d+,\d+"\s*\/>\s*<\/svg>$/

export const SvgSelectorSchema = z.object({
  type: z.literal('SvgSelector'),
  value: z.string().regex(svg)
})

export const TargetSchema = z.object({
  // type: z.literal('Image'),
  source: z.string().url(),
  service: z
    .array(
      z.object({
        '@id': z.string().url(),
        type: ImageServiceSchema
      })
    )
    .length(1),
  selector: SvgSelectorSchema
})

export const BodySchema = z.object({
  type: z.literal('FeatureCollection'),
  purpose: z.literal('gcp-georeferencing').optional(),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: z.object({
        pixelCoords: PointSchema
      }),
      geometry: z.object({
        type: z.literal('Point'),
        coordinates: PointSchema
      })
    })
  )
})

export const AnnotationSchema = z.object({
  id: z.string().url().optional(),
  type: z.literal('Annotation'),
  '@context': z.string().url().optional().array(),
  motivation: z.literal('georeferencing').optional(),
  target: TargetSchema,
  body: BodySchema
})

export const AnnotationPageSchema = z.object({
  id: z.string().url().optional(),
  type: z.literal('AnnotationPage'),
  '@context': z.string().url().optional().array(),
  items: z.array(AnnotationSchema)
})

//   "additionalProperties": false,
//   "required": ["type", "target", "body"],
//   "$defs": {
//     "context": {
//       "type": "array",
//       "items": {
//         "type": "string",
//         "format": "uri"
//       },
//       "allOf": [
//         {
//           "contains": {
//             "const": "http://www.w3.org/ns/anno.jsonld"
//           }
//         },
//         {
//           "contains": {
//             "const": "http://geojson.org/geojson-ld/geojson-context.jsonld"
//           }
//         },
//         {
//           "contains": {
//             "const": "http://iiif.io/api/presentation/3/context.json"
//           }
//         }
//       ],
//       "errorMessage": "Invalid JSON-LD context. Property `@context` must be an array containing all of the following URLs: `\"http://www.w3.org/ns/anno.jsonld\"`, `\"http://geojson.org/geojson-ld/geojson-context.jsonld\"` and `http://iiif.io/api/presentation/3/context.json\"`."
//     },
//     "target": {
//       "type": "object",
//       "properties": {
//         "type": {
//           "const": "Image",
//           "errorMessage": "Invalid annotation target. The property `type` of the annotation target must have value `\"Image\"`."
//         },
//         "source": {
//           "type": "string",
//           "format": "uri",
//           "errorMessage": "Invalid annotation target. The property `source` of the annotation target must be a valid IIIF Image API URI."
//         },
//         "service": {
//           "type": "array",
//           "minItems": 1,
//           "maxItems": 1,
//           "prefixItems": [
//             {
//               "type": "object",
//               "properties": {
//                 "type": {
//                   "type": "string",
//                   "enum": ["ImageService2", "ImageService3"],
//                   "errorMessage": "Invalid image service, only IIIF Image API 2.0 and 3.0 are supported. The property `type` of the single object in the `service` array must be either `\"ImageService2\"` or `\"ImageService3\"`."
//                 },
//                 "@id": {
//                   "type": "string",
//                   "format": "uri",
//                   "errorMessage": "Invalid image serice. The property `@id` of the single object in the `service` array must be a [valid URI](https://datatracker.ietf.org/doc/html/rfc3986)."
//                 }
//               },
//               "required": ["type", "@id"]
//             }
//           ],
//           "errorMessage": "Invalid image service. The property `service` of the annnotation target must be an array with a single object and required properties `type` and `@id`."
//         },
//         "selector": {
//           "type": "object",
//           "properties": {
//             "type": {
//               "const": "SvgSelector"
//             },
//             "value": {
//               "type": "string",
//               "pattern": "^<svg\\s+width=\"\\d+\"\\sheight=\"\\d+\"\\s*>\\s*<polygon\\s+points=\"(\\d+,\\d+\\s+){2,}\\d+,\\d+\"\\s*\\/>\\s*<\\/svg>$"
//             }
//           },
//           "required": ["type", "value"],
//           "errorMessage": "Invalid selector. The property `selector` of the annotation target must be a valid SvgSelector with a single `<polygon>` element."
//         }
//       },
//       "additionalProperties": false,
//       "required": ["type", "source", "service", "selector"],
//       "errorMessage": "Invalid annotation target. Annotation target must be an object with required properties `type`, `source`, `service`, and `selector`."
//     },
//     "body": {
//       "type": "object",
//       "properties": {
//         "type": {
//           "const": "FeatureCollection",
//           "errorMessage": "Invalid annotation body. Annotation body must be a GeoJSON FeatureCollection and have a property `type` with value `\"FeatureCollection\"`."
//         },
//         "purpose": {
//           "const": "gcp-georeferencing",
//           "errorMessage": "Invalid purpose in annotation body. Annotation property `body` must be a GeoJSON FeatureCollection and should have property `purpose` with value `\"gcp-georeferencing\"`."
//         },
//         "transformation": {
//           "type": "object",
//           "errorMessage": "Invalid transformation. Annotation property `body` must be a GeoJSON FeatureCollection and should have object property `transformation` with metadata for the transformation algorithm."
//         },
//         "features": {
//           "type": "array",
//           "items": {
//             "$ref": "#/$defs/feature"
//           }
//         }
//       },
//       "additionalProperties": false,
//       "required": ["type", "features"],
//       "errorMessage": "Invalid annotation body. Annotation body must be an object with required properties `type`, `@context`, `target`, `body`."
//     },
//     "feature": {
//       "type": "object",
//       "properties": {
//         "type": {
//           "const": "Feature",
//           "errorMessage": "Invalid GCP in annotation body. Annotation body must be a GeoJSON FeatureCollection, each of its features must have property `type` with value `\"Feature\"`."
//         },
//         "id": {
//           "type": ["integer", "string"]
//         },
//         "properties": {
//           "type": "object",
//           "properties": {
//             "pixelCoords": {
//               "$ref": "#/$defs/pixelCoord"
//             }
//           },
//           "additionalProperties": false,
//           "required": ["pixelCoords"]
//         },
//         "geometry": {
//           "type": "object",
//           "properties": {
//             "type": {
//               "const": "Point"
//             },
//             "coordinates": {
//               "type": "array",
//               "items": {
//                 "type": "number"
//               },
//               "minItems": 2,
//               "maxItems": 2,
//               "errorMessage": "Invalid GCP geometry. Annotation body must be a GeoJSON FeatureCollection and each Feature must have a Point geometry."
//             }
//           },
//           "additionalProperties": false,
//           "required": ["type", "coordinates"],
//           "errorMessage": "Invalid GCP geometry. Annotation body must be a GeoJSON FeatureCollection and each Feature must have a Point geometry."
//         }
//       },
//       "additionalProperties": false,
//       "required": ["type", "properties", "geometry"],
//       "errorMessage": "Invalid GCP. Annotation body must be a GeoJSON FeatureCollection and each Feature must have a Point geometry and property `pixelCoords` (`[x, y]`) in its `properties` object."
//     },
//     "pixelCoords": {
//       "type": "array",
//       "minItems": 2,
//       "maxItems": 2,
//       "items": { "type": "integer" },
//       "errorMessage": "Invalid GCP. Annotation body must be a GeoJSON FeatureCollection and each Feature must have a property `pixelCoords` (`[x, y]`) in its `properties` object."
//     }
//   },
//   "errorMessage": "Invalid annotation. Annotation must be an object with required properties `type`, `@context`, `target` and `body`."
// }
