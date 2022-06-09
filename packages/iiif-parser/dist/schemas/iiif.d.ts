export declare const CanvasSchema: import("zod").ZodUnion<[import("zod").ZodObject<{
    '@id': import("zod").ZodString;
    '@type': import("zod").ZodLiteral<"sc:Canvas">;
    width: import("zod").ZodNumber;
    height: import("zod").ZodNumber;
    images: import("zod").ZodArray<import("zod").ZodObject<{
        resource: import("zod").ZodObject<{
            width: import("zod").ZodNumber;
            height: import("zod").ZodNumber;
            service: import("zod").ZodUnion<[import("zod").ZodObject<{
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
        }, "strip", import("zod").ZodTypeAny, {
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
    }, "strip", import("zod").ZodTypeAny, {
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
}, "strip", import("zod").ZodTypeAny, {
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
}>, import("zod").ZodObject<{
    id: import("zod").ZodString;
    type: import("zod").ZodLiteral<"Canvas">;
    width: import("zod").ZodNumber;
    height: import("zod").ZodNumber;
    items: import("zod").ZodArray<import("zod").ZodObject<{
        type: import("zod").ZodLiteral<"AnnotationPage">;
        items: import("zod").ZodArray<import("zod").ZodObject<{
            type: import("zod").ZodLiteral<"Annotation">;
            body: import("zod").ZodObject<{
                type: import("zod").ZodLiteral<"Image">;
                width: import("zod").ZodNumber;
                height: import("zod").ZodNumber;
                service: import("zod").ZodArray<import("zod").ZodUnion<[import("zod").ZodObject<{
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
                }>]>, "many">;
            }, "strip", import("zod").ZodTypeAny, {
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
        }, "strip", import("zod").ZodTypeAny, {
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
    }, "strip", import("zod").ZodTypeAny, {
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
    label: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
    metadata: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        label: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
        value: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }, {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }>, "many">>;
}, "strip", import("zod").ZodTypeAny, {
    label?: Record<string, string[]> | undefined;
    metadata?: {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }[] | undefined;
    type: "Canvas";
    width: number;
    height: number;
    id: string;
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
}, {
    label?: Record<string, string[]> | undefined;
    metadata?: {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }[] | undefined;
    type: "Canvas";
    width: number;
    height: number;
    id: string;
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
}>]>;
export declare const ManifestSchema: import("zod").ZodUnion<[import("zod").ZodObject<{
    '@id': import("zod").ZodString;
    '@type': import("zod").ZodLiteral<"sc:Manifest">;
    sequences: import("zod").ZodArray<import("zod").ZodObject<{
        canvases: import("zod").ZodArray<import("zod").ZodObject<{
            '@id': import("zod").ZodString;
            '@type': import("zod").ZodLiteral<"sc:Canvas">;
            width: import("zod").ZodNumber;
            height: import("zod").ZodNumber;
            images: import("zod").ZodArray<import("zod").ZodObject<{
                resource: import("zod").ZodObject<{
                    width: import("zod").ZodNumber;
                    height: import("zod").ZodNumber;
                    service: import("zod").ZodUnion<[import("zod").ZodObject<{
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
                }, "strip", import("zod").ZodTypeAny, {
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
            }, "strip", import("zod").ZodTypeAny, {
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
        }, "strip", import("zod").ZodTypeAny, {
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
    }, "strip", import("zod").ZodTypeAny, {
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
    label: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    description: import("zod").ZodOptional<import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>>;
    metadata: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        label: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
        value: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    }, "strip", import("zod").ZodTypeAny, {
        label: {};
        value: {};
    }, {
        label: {};
        value: {};
    }>, "many">>;
}, "strip", import("zod").ZodTypeAny, {
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
}>, import("zod").ZodObject<{
    id: import("zod").ZodString;
    type: import("zod").ZodLiteral<"Manifest">;
    items: import("zod").ZodArray<import("zod").ZodObject<{
        id: import("zod").ZodString;
        type: import("zod").ZodLiteral<"Canvas">;
        width: import("zod").ZodNumber;
        height: import("zod").ZodNumber;
        items: import("zod").ZodArray<import("zod").ZodObject<{
            type: import("zod").ZodLiteral<"AnnotationPage">;
            items: import("zod").ZodArray<import("zod").ZodObject<{
                type: import("zod").ZodLiteral<"Annotation">;
                body: import("zod").ZodObject<{
                    type: import("zod").ZodLiteral<"Image">;
                    width: import("zod").ZodNumber;
                    height: import("zod").ZodNumber;
                    service: import("zod").ZodArray<import("zod").ZodUnion<[import("zod").ZodObject<{
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
                    }>]>, "many">;
                }, "strip", import("zod").ZodTypeAny, {
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
            }, "strip", import("zod").ZodTypeAny, {
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
        }, "strip", import("zod").ZodTypeAny, {
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
        label: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
        metadata: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
            label: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
            value: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
        }, "strip", import("zod").ZodTypeAny, {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }, {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }>, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }, {
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }>, "atleastone">;
    label: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
    metadata: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        label: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
        value: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }, {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }>, "many">>;
}, "strip", import("zod").ZodTypeAny, {
    metadata?: {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }[] | undefined;
    label: Record<string, string[]>;
    type: "Manifest";
    id: string;
    items: [{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }, ...{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }[]];
}, {
    metadata?: {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }[] | undefined;
    label: Record<string, string[]>;
    type: "Manifest";
    id: string;
    items: [{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }, ...{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }[]];
}>]>;
export declare const ImageSchema: import("zod").ZodUnion<[import("zod").ZodObject<{
    '@context': import("zod").ZodLiteral<"http://iiif.io/api/image/2/context.json">;
    '@id': import("zod").ZodString;
    '@type': import("zod").ZodOptional<import("zod").ZodLiteral<"iiif:Image">>;
    protocol: import("zod").ZodLiteral<"http://iiif.io/api/image">;
    width: import("zod").ZodNumber;
    height: import("zod").ZodNumber;
    profile: import("zod").ZodArray<import("zod").ZodUnion<[import("zod").ZodEnum<["http://iiif.io/api/image/2/level0.json", "http://iiif.io/api/image/2/level1.json", "http://iiif.io/api/image/2/level2.json"]>, import("zod").ZodObject<{
        formats: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        maxArea: import("zod").ZodOptional<import("zod").ZodNumber>;
        maxHeight: import("zod").ZodOptional<import("zod").ZodNumber>;
        maxWidth: import("zod").ZodOptional<import("zod").ZodNumber>;
        qualities: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        supports: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
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
    sizes: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodNumber;
    }, "strip", import("zod").ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>, "many">>;
    tiles: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodOptional<import("zod").ZodNumber>;
        scaleFactors: import("zod").ZodArray<import("zod").ZodNumber, "many">;
    }, "strip", import("zod").ZodTypeAny, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }>, "many">>;
}, "strip", import("zod").ZodTypeAny, {
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
    "@id": string;
    profile: ("http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json" | {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    })[];
    "@context": "http://iiif.io/api/image/2/context.json";
    protocol: "http://iiif.io/api/image";
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
    "@id": string;
    profile: ("http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json" | {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    })[];
    "@context": "http://iiif.io/api/image/2/context.json";
    protocol: "http://iiif.io/api/image";
}>, import("zod").ZodObject<{
    id: import("zod").ZodString;
    type: import("zod").ZodLiteral<"ImageService3">;
    protocol: import("zod").ZodLiteral<"http://iiif.io/api/image">;
    profile: import("zod").ZodEnum<["level0", "level1", "level2"]>;
    width: import("zod").ZodNumber;
    height: import("zod").ZodNumber;
    maxWidth: import("zod").ZodOptional<import("zod").ZodNumber>;
    maxHeight: import("zod").ZodOptional<import("zod").ZodNumber>;
    maxArea: import("zod").ZodOptional<import("zod").ZodNumber>;
    sizes: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodNumber;
    }, "strip", import("zod").ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>, "many">>;
    tiles: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodOptional<import("zod").ZodNumber>;
        scaleFactors: import("zod").ZodArray<import("zod").ZodNumber, "many">;
    }, "strip", import("zod").ZodTypeAny, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }>, "many">>;
    extraFeatures: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
}, "strip", import("zod").ZodTypeAny, {
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
    profile: "level0" | "level1" | "level2";
    id: string;
    protocol: "http://iiif.io/api/image";
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
    profile: "level0" | "level1" | "level2";
    id: string;
    protocol: "http://iiif.io/api/image";
}>]>;
export declare const IIIFSchema: import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodObject<{
    '@id': import("zod").ZodString;
    '@type': import("zod").ZodLiteral<"sc:Manifest">;
    sequences: import("zod").ZodArray<import("zod").ZodObject<{
        canvases: import("zod").ZodArray<import("zod").ZodObject<{
            '@id': import("zod").ZodString;
            '@type': import("zod").ZodLiteral<"sc:Canvas">;
            width: import("zod").ZodNumber;
            height: import("zod").ZodNumber;
            images: import("zod").ZodArray<import("zod").ZodObject<{
                resource: import("zod").ZodObject<{
                    width: import("zod").ZodNumber;
                    height: import("zod").ZodNumber;
                    service: import("zod").ZodUnion<[import("zod").ZodObject<{
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
                }, "strip", import("zod").ZodTypeAny, {
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
            }, "strip", import("zod").ZodTypeAny, {
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
        }, "strip", import("zod").ZodTypeAny, {
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
    }, "strip", import("zod").ZodTypeAny, {
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
    label: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    description: import("zod").ZodOptional<import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>>;
    metadata: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        label: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
        value: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    }, "strip", import("zod").ZodTypeAny, {
        label: {};
        value: {};
    }, {
        label: {};
        value: {};
    }>, "many">>;
}, "strip", import("zod").ZodTypeAny, {
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
}>, import("zod").ZodObject<{
    id: import("zod").ZodString;
    type: import("zod").ZodLiteral<"Manifest">;
    items: import("zod").ZodArray<import("zod").ZodObject<{
        id: import("zod").ZodString;
        type: import("zod").ZodLiteral<"Canvas">;
        width: import("zod").ZodNumber;
        height: import("zod").ZodNumber;
        items: import("zod").ZodArray<import("zod").ZodObject<{
            type: import("zod").ZodLiteral<"AnnotationPage">;
            items: import("zod").ZodArray<import("zod").ZodObject<{
                type: import("zod").ZodLiteral<"Annotation">;
                body: import("zod").ZodObject<{
                    type: import("zod").ZodLiteral<"Image">;
                    width: import("zod").ZodNumber;
                    height: import("zod").ZodNumber;
                    service: import("zod").ZodArray<import("zod").ZodUnion<[import("zod").ZodObject<{
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
                    }>]>, "many">;
                }, "strip", import("zod").ZodTypeAny, {
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
            }, "strip", import("zod").ZodTypeAny, {
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
        }, "strip", import("zod").ZodTypeAny, {
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
        label: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
        metadata: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
            label: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
            value: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
        }, "strip", import("zod").ZodTypeAny, {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }, {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }>, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }, {
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }>, "atleastone">;
    label: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
    metadata: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        label: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
        value: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }, {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }>, "many">>;
}, "strip", import("zod").ZodTypeAny, {
    metadata?: {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }[] | undefined;
    label: Record<string, string[]>;
    type: "Manifest";
    id: string;
    items: [{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }, ...{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }[]];
}, {
    metadata?: {
        label: Record<string, string[]>;
        value: Record<string, string[]>;
    }[] | undefined;
    label: Record<string, string[]>;
    type: "Manifest";
    id: string;
    items: [{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }, ...{
        label?: Record<string, string[]> | undefined;
        metadata?: {
            label: Record<string, string[]>;
            value: Record<string, string[]>;
        }[] | undefined;
        type: "Canvas";
        width: number;
        height: number;
        id: string;
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
    }[]];
}>]>, import("zod").ZodUnion<[import("zod").ZodObject<{
    '@context': import("zod").ZodLiteral<"http://iiif.io/api/image/2/context.json">;
    '@id': import("zod").ZodString;
    '@type': import("zod").ZodOptional<import("zod").ZodLiteral<"iiif:Image">>;
    protocol: import("zod").ZodLiteral<"http://iiif.io/api/image">;
    width: import("zod").ZodNumber;
    height: import("zod").ZodNumber;
    profile: import("zod").ZodArray<import("zod").ZodUnion<[import("zod").ZodEnum<["http://iiif.io/api/image/2/level0.json", "http://iiif.io/api/image/2/level1.json", "http://iiif.io/api/image/2/level2.json"]>, import("zod").ZodObject<{
        formats: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        maxArea: import("zod").ZodOptional<import("zod").ZodNumber>;
        maxHeight: import("zod").ZodOptional<import("zod").ZodNumber>;
        maxWidth: import("zod").ZodOptional<import("zod").ZodNumber>;
        qualities: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        supports: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
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
    sizes: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodNumber;
    }, "strip", import("zod").ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>, "many">>;
    tiles: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodOptional<import("zod").ZodNumber>;
        scaleFactors: import("zod").ZodArray<import("zod").ZodNumber, "many">;
    }, "strip", import("zod").ZodTypeAny, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }>, "many">>;
}, "strip", import("zod").ZodTypeAny, {
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
    "@id": string;
    profile: ("http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json" | {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    })[];
    "@context": "http://iiif.io/api/image/2/context.json";
    protocol: "http://iiif.io/api/image";
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
    "@id": string;
    profile: ("http://iiif.io/api/image/2/level0.json" | "http://iiif.io/api/image/2/level1.json" | "http://iiif.io/api/image/2/level2.json" | {
        formats?: string[] | undefined;
        maxArea?: number | undefined;
        maxHeight?: number | undefined;
        maxWidth?: number | undefined;
        qualities?: string[] | undefined;
        supports?: string[] | undefined;
    })[];
    "@context": "http://iiif.io/api/image/2/context.json";
    protocol: "http://iiif.io/api/image";
}>, import("zod").ZodObject<{
    id: import("zod").ZodString;
    type: import("zod").ZodLiteral<"ImageService3">;
    protocol: import("zod").ZodLiteral<"http://iiif.io/api/image">;
    profile: import("zod").ZodEnum<["level0", "level1", "level2"]>;
    width: import("zod").ZodNumber;
    height: import("zod").ZodNumber;
    maxWidth: import("zod").ZodOptional<import("zod").ZodNumber>;
    maxHeight: import("zod").ZodOptional<import("zod").ZodNumber>;
    maxArea: import("zod").ZodOptional<import("zod").ZodNumber>;
    sizes: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodNumber;
    }, "strip", import("zod").ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>, "many">>;
    tiles: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        width: import("zod").ZodNumber;
        height: import("zod").ZodOptional<import("zod").ZodNumber>;
        scaleFactors: import("zod").ZodArray<import("zod").ZodNumber, "many">;
    }, "strip", import("zod").ZodTypeAny, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }, {
        height?: number | undefined;
        width: number;
        scaleFactors: number[];
    }>, "many">>;
    extraFeatures: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
}, "strip", import("zod").ZodTypeAny, {
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
    profile: "level0" | "level1" | "level2";
    id: string;
    protocol: "http://iiif.io/api/image";
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
    profile: "level0" | "level1" | "level2";
    id: string;
    protocol: "http://iiif.io/api/image";
}>]>]>;
