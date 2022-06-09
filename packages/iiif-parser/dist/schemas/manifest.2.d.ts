import { z } from 'zod';
export declare const Canvas2Schema: z.ZodObject<{
    '@id': z.ZodString;
    '@type': z.ZodLiteral<"sc:Canvas">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    images: z.ZodArray<z.ZodObject<{
        resource: z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
            service: z.ZodUnion<[z.ZodObject<{
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
            }>]>;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
            service: {
                "@id": string;
                profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
            } | {
                width: number;
                height: number;
                id: string;
            };
        }, {
            width: number;
            height: number;
            service: {
                "@id": string;
                profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
            } | {
                width: number;
                height: number;
                id: string;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        resource: {
            width: number;
            height: number;
            service: {
                "@id": string;
                profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
            } | {
                width: number;
                height: number;
                id: string;
            };
        };
    }, {
        resource: {
            width: number;
            height: number;
            service: {
                "@id": string;
                profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
            } | {
                width: number;
                height: number;
                id: string;
            };
        };
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    "@id": string;
    "@type": "sc:Canvas";
    images: {
        resource: {
            width: number;
            height: number;
            service: {
                "@id": string;
                profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
            } | {
                width: number;
                height: number;
                id: string;
            };
        };
    }[];
}, {
    width: number;
    height: number;
    "@id": string;
    "@type": "sc:Canvas";
    images: {
        resource: {
            width: number;
            height: number;
            service: {
                "@id": string;
                profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
            } | {
                width: number;
                height: number;
                id: string;
            };
        };
    }[];
}>;
export declare const Manifest2Schema: z.ZodObject<{
    '@id': z.ZodString;
    '@type': z.ZodLiteral<"sc:Manifest">;
    sequences: z.ZodArray<z.ZodObject<{
        canvases: z.ZodArray<z.ZodObject<{
            '@id': z.ZodString;
            '@type': z.ZodLiteral<"sc:Canvas">;
            width: z.ZodNumber;
            height: z.ZodNumber;
            images: z.ZodArray<z.ZodObject<{
                resource: z.ZodObject<{
                    width: z.ZodNumber;
                    height: z.ZodNumber;
                    service: z.ZodUnion<[z.ZodObject<{
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
                    }>]>;
                }, "strip", z.ZodTypeAny, {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                }, {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                }>;
            }, "strip", z.ZodTypeAny, {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }, {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }, {
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }>, "atleastone">;
    }, "strip", z.ZodTypeAny, {
        canvases: [{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }, ...{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }[]];
    }, {
        canvases: [{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }, ...{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }[]];
    }>, "many">;
    label: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    description: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    metadata: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        value: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    }, "strip", z.ZodTypeAny, {
        label: {};
        value: {};
    }, {
        label: {};
        value: {};
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    description?: {} | undefined;
    metadata?: {
        label: {};
        value: {};
    }[] | undefined;
    label: {};
    "@id": string;
    "@type": "sc:Manifest";
    sequences: {
        canvases: [{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }, ...{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }[]];
    }[];
}, {
    description?: {} | undefined;
    metadata?: {
        label: {};
        value: {};
    }[] | undefined;
    label: {};
    "@id": string;
    "@type": "sc:Manifest";
    sequences: {
        canvases: [{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }, ...{
            width: number;
            height: number;
            "@id": string;
            "@type": "sc:Canvas";
            images: {
                resource: {
                    width: number;
                    height: number;
                    service: {
                        "@id": string;
                        profile: "http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json";
                    } | {
                        width: number;
                        height: number;
                        id: string;
                    };
                };
            }[];
        }[]];
    }[];
}>;
