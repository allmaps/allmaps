import { z } from 'zod';
export declare const SizeSchema: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>;
export declare const TilesetSchema: z.ZodObject<{
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
}>;
