import { z } from 'zod';
export declare const ImageService3Schema: z.ZodObject<{
    id: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    id: string;
}, {
    width: number;
    height: number;
    id: string;
}>;
