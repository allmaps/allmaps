import { z } from 'zod';
export declare const Image2ProfileDescriptionSchema: z.ZodObject<{
    formats: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    maxArea: z.ZodOptional<z.ZodNumber>;
    maxHeight: z.ZodOptional<z.ZodNumber>;
    maxWidth: z.ZodOptional<z.ZodNumber>;
    qualities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    supports: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    formats?: string[] | undefined;
    maxArea?: number | undefined;
    maxHeight?: number | undefined;
    maxWidth?: number | undefined;
    qualities?: string[] | undefined;
    supports?: string[] | undefined;
}, {
    formats?: string[] | undefined;
    maxArea?: number | undefined;
    maxHeight?: number | undefined;
    maxWidth?: number | undefined;
    qualities?: string[] | undefined;
    supports?: string[] | undefined;
}>;
export declare const Image2Schema: z.ZodObject<{
    '@context': z.ZodLiteral<"http://iiif.io/api/image/2/context.json">;
    '@id': z.ZodString;
    '@type': z.ZodOptional<z.ZodLiteral<"iiif:Image">>;
    protocol: z.ZodLiteral<"http://iiif.io/api/image">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    profile: z.ZodArray<z.ZodUnion<[z.ZodEnum<["http://iiif.io/api/image/2/level0.json", "http://iiif.io/api/image/2/level1.json", "http://iiif.io/api/image/2/level2.json"]>, z.ZodObject<{
        formats: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        maxArea: z.ZodOptional<z.ZodNumber>;
        maxHeight: z.ZodOptional<z.ZodNumber>;
        maxWidth: z.ZodOptional<z.ZodNumber>;
        qualities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        supports: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    }, {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    }>]>, "many">;
    sizes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>, "many">>;
    tiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodOptional<z.ZodNumber>;
        scaleFactors: z.ZodArray<z.ZodNumber, "many">;
    }, "strip", z.ZodTypeAny, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    "@type"?: "iiif:Image" | undefined;
    sizes?: {
        width: number;
        height: number;
    }[] | undefined;
    tiles?: {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }[] | undefined;
    width: number;
    height: number;
    "@context": "http://iiif.io/api/image/2/context.json";
    "@id": string;
    protocol: "http://iiif.io/api/image";
    profile: ("http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json" | {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    })[];
}, {
    "@type"?: "iiif:Image" | undefined;
    sizes?: {
        width: number;
        height: number;
    }[] | undefined;
    tiles?: {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }[] | undefined;
    width: number;
    height: number;
    "@context": "http://iiif.io/api/image/2/context.json";
    "@id": string;
    protocol: "http://iiif.io/api/image";
    profile: ("http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json" | {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    })[];
}>;
