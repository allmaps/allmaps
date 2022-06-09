import { z } from 'zod';
export declare const ImageService2Schema: z.ZodObject<{
    '@id': z.ZodString;
    profile: z.ZodEnum<["http://iiif.io/api/image/2/level0.json", "http://iiif.io/api/image/2/level1.json", "http://iiif.io/api/image/2/level2.json"]>;
}, "strip", z.ZodTypeAny, {
    "@id": string;
    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
}, {
    "@id": string;
    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
}>;
