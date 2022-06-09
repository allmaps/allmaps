import { z } from 'zod';
export declare const Image3Schema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"ImageService3">;
    protocol: z.ZodLiteral<"http://iiif.io/api/image">;
    profile: z.ZodEnum<["level0", "level1", "level2"]>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    maxWidth: z.ZodOptional<z.ZodNumber>;
    maxHeight: z.ZodOptional<z.ZodNumber>;
    maxArea: z.ZodOptional<z.ZodNumber>;
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
    extraFeatures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    maxArea?: number | undefined;
    maxHeight?: number | undefined;
    maxWidth?: number | undefined;
    sizes?: {
        width: number;
        height: number;
    }[] | undefined;
    tiles?: {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }[] | undefined;
    extraFeatures?: string[] | undefined;
    type: "ImageService3";
    width: number;
    height: number;
    protocol: "http://iiif.io/api/image";
    profile: "level0" | "level1" | "level2";
    id: string;
}, {
    maxArea?: number | undefined;
    maxHeight?: number | undefined;
    maxWidth?: number | undefined;
    sizes?: {
        width: number;
        height: number;
    }[] | undefined;
    tiles?: {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }[] | undefined;
    extraFeatures?: string[] | undefined;
    type: "ImageService3";
    width: number;
    height: number;
    protocol: "http://iiif.io/api/image";
    profile: "level0" | "level1" | "level2";
    id: string;
}>;
