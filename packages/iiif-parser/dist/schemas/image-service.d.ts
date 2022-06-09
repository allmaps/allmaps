export declare const ImageServiceSchema: import("zod").ZodUnion<[import("zod").ZodObject<{
    '@id': import("zod").ZodString;
    profile: import("zod").ZodEnum<["http://iiif.io/api/image/2/level0.json", "http://iiif.io/api/image/2/level1.json", "http://iiif.io/api/image/2/level2.json"]>;
}, "strip", import("zod").ZodTypeAny, {
    "@id": string;
    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
}, {
    "@id": string;
    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
}>, import("zod").ZodObject<{
    id: import("zod").ZodString;
    width: import("zod").ZodNumber;
    height: import("zod").ZodNumber;
}, "strip", import("zod").ZodTypeAny, {
    width: number;
    height: number;
    id: string;
}, {
    width: number;
    height: number;
    id: string;
}>]>;
