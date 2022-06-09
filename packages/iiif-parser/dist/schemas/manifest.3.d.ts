import { z } from 'zod';
export declare const Canvas3Schema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"Canvas">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    items: z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"AnnotationPage">;
        items: z.ZodArray<z.ZodObject<{
            type: z.ZodLiteral<"Annotation">;
            body: z.ZodObject<{
                type: z.ZodLiteral<"Image">;
                width: z.ZodNumber;
                height: z.ZodNumber;
                service: z.ZodArray<z.ZodUnion<[z.ZodObject<{
                    '@id': z.ZodString;
                    profile: z.ZodEnum<["http://iiif.io/api/image/2/level0.json", "http://iiif.io/api/image/2/level1.json", "http://iiif.io/api/image/2/level2.json"]>;
                }, "strip", z.ZodTypeAny, {
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                }, {
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                }>, z.ZodObject<{
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
                }>]>, "many">;
            }, "strip", z.ZodTypeAny, {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            }, {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "Annotation";
            body: {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            };
        }, {
            type: "Annotation";
            body: {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            };
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "AnnotationPage";
        items: {
            type: "Annotation";
            body: {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            };
        }[];
    }, {
        type: "AnnotationPage";
        items: {
            type: "Annotation";
            body: {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            };
        }[];
    }>, "many">;
    label: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    metadata: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
        value: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }, {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    label?: Record<string, string[]> | undefined;
    metadata?: {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }[] | undefined;
    type: "Canvas";
    items: {
        type: "AnnotationPage";
        items: {
            type: "Annotation";
            body: {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            };
        }[];
    }[];
    width: number;
    height: number;
    id: string;
}, {
    label?: Record<string, string[]> | undefined;
    metadata?: {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }[] | undefined;
    type: "Canvas";
    items: {
        type: "AnnotationPage";
        items: {
            type: "Annotation";
            body: {
                type: "Image";
                width: number;
                height: number;
                service: ({
                    "@id": string;
                    profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                } | {
                    width: number;
                    height: number;
                    id: string;
                })[];
            };
        }[];
    }[];
    width: number;
    height: number;
    id: string;
}>;
export declare const Manifest3Schema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"Manifest">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"Canvas">;
        width: z.ZodNumber;
        height: z.ZodNumber;
        items: z.ZodArray<z.ZodObject<{
            type: z.ZodLiteral<"AnnotationPage">;
            items: z.ZodArray<z.ZodObject<{
                type: z.ZodLiteral<"Annotation">;
                body: z.ZodObject<{
                    type: z.ZodLiteral<"Image">;
                    width: z.ZodNumber;
                    height: z.ZodNumber;
                    service: z.ZodArray<z.ZodUnion<[z.ZodObject<{
                        '@id': z.ZodString;
                        profile: z.ZodEnum<["http://iiif.io/api/image/2/level0.json", "http://iiif.io/api/image/2/level1.json", "http://iiif.io/api/image/2/level2.json"]>;
                    }, "strip", z.ZodTypeAny, {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    }, {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    }>, z.ZodObject<{
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
                    }>]>, "many">;
                }, "strip", z.ZodTypeAny, {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                }, {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }, {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }, {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }>, "many">;
        label: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        metadata: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
            value: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }, {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        label?: Record<string, string[]> | undefined;
        metadata?: {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        items: {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }[];
        width: number;
        height: number;
        id: string;
    }, {
        label?: Record<string, string[]> | undefined;
        metadata?: {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        items: {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }[];
        width: number;
        height: number;
        id: string;
    }>, "atleastone">;
    label: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
        value: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }, {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    metadata?: {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }[] | undefined;
    type: "Manifest";
    items: [{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        items: {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }[];
        width: number;
        height: number;
        id: string;
    }, ...{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        items: {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }[];
        width: number;
        height: number;
        id: string;
    }[]];
    id: string;
    label: Record<string, string[]>;
}, {
    metadata?: {
        value: Record<string, string[]>;
        label: Record<string, string[]>;
    }[] | undefined;
    type: "Manifest";
    items: [{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        items: {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }[];
        width: number;
        height: number;
        id: string;
    }, ...{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            value: Record<string, string[]>;
            label: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        items: {
            type: "AnnotationPage";
            items: {
                type: "Annotation";
                body: {
                    type: "Image";
                    width: number;
                    height: number;
                    service: ({
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    })[];
                };
            }[];
        }[];
        width: number;
        height: number;
        id: string;
    }[]];
    id: string;
    label: Record<string, string[]>;
}>;
