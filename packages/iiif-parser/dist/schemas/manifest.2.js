// Presentation API 2.1 - Manifest
// https://iiif.io/api/presentation/2.1/#manifest
import { z } from 'zod';
import { ImageServiceSchema } from './image-service.js';
const StringValue2Schema = z.object({});
// {"description": {"@value": "Here is a longer description of the object", "@language": "en"}}
// {
//   "label": [
//     { "@language": "de", "@value": "Umfang" },
//     { "@language": "en", "@value": "Scope" }
//   ],
//   "value": "1 Karte"
// },
const MetadataEntry2Schema = z.object({
    label: StringValue2Schema,
    value: StringValue2Schema
});
const ImageResource2Schema = z.object({
    resource: z.object({
        width: z.number().int(),
        height: z.number().int(),
        service: ImageServiceSchema
    })
});
export const Canvas2Schema = z.object({
    '@id': z.string().url(),
    '@type': z.literal('sc:Canvas'),
    // TODO: add label MUST
    // metadata OPTIONAL
    width: z.number().int(),
    height: z.number().int(),
    images: ImageResource2Schema.array().length(1)
});
const Sequence2Schema = z.object({
    canvases: Canvas2Schema.array().nonempty()
});
export const Manifest2Schema = z.object({
    // Of array met deze als eerste
    // '@context': z.literal('http://iiif.io/api/presentation/2/context.json'),
    '@id': z.string().url(),
    '@type': z.literal('sc:Manifest'),
    sequences: Sequence2Schema.array().length(1),
    label: StringValue2Schema,
    description: StringValue2Schema.optional(),
    metadata: MetadataEntry2Schema.array().optional()
});
